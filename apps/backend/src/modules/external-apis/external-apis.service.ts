import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateExternalApiDto, UpdateExternalApiDto, InvokeExternalApiDto } from './dto';

@Injectable()
export class ExternalApisService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateExternalApiDto) {
    // Verify environment exists
    const environment = await this.prisma.environment.findUnique({
      where: { id: dto.environment_id },
    });
    if (!environment) {
      throw new NotFoundException('Environment not found');
    }

    // Verify form exists if provided
    if (dto.form_id) {
      const form = await this.prisma.formDefinition.findUnique({
        where: { id: dto.form_id },
      });
      if (!form) {
        throw new NotFoundException('Form not found');
      }
    }

    return this.prisma.externalApi.create({
      data: {
        environmentId: dto.environment_id,
        formId: dto.form_id,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        apiType: dto.api_type || 'CONSULTA_IA',
        baseUrl: dto.base_url,
        endpoint: dto.endpoint,
        method: dto.method || 'POST',
        headers: (dto.headers || {}) as Prisma.InputJsonValue,
        authType: dto.auth_type,
        authConfig: (dto.auth_config || {}) as Prisma.InputJsonValue,
        requestBody: (dto.request_body || {}) as Prisma.InputJsonValue,
        timeout: dto.timeout || 30000,
        enabled: dto.enabled ?? true,
      },
      include: {
        environment: {
          select: { id: true, name: true, code: true },
        },
        form: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async findAll(environmentId?: string) {
    return this.prisma.externalApi.findMany({
      where: environmentId ? { environmentId } : undefined,
      include: {
        environment: {
          select: { id: true, name: true, code: true },
        },
        form: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const api = await this.prisma.externalApi.findUnique({
      where: { id },
      include: {
        environment: {
          select: { id: true, name: true, code: true },
        },
        form: {
          select: { id: true, name: true, code: true },
        },
      },
    });
    if (!api) {
      throw new NotFoundException('External API not found');
    }
    return api;
  }

  async findByFormId(formId: string) {
    return this.prisma.externalApi.findMany({
      where: { formId, enabled: true },
      include: {
        environment: {
          select: { id: true, name: true, code: true },
        },
        form: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async update(id: string, dto: UpdateExternalApiDto) {
    await this.findOne(id);

    const updateData: Prisma.ExternalApiUpdateInput = {};

    if (dto.environment_id) {
      updateData.environment = { connect: { id: dto.environment_id } };
    }
    if (dto.form_id !== undefined) {
      updateData.form = dto.form_id ? { connect: { id: dto.form_id } } : { disconnect: true };
    }
    if (dto.name) updateData.name = dto.name;
    if (dto.code) updateData.code = dto.code;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.base_url) updateData.baseUrl = dto.base_url;
    if (dto.endpoint) updateData.endpoint = dto.endpoint;
    if (dto.method) updateData.method = dto.method;
    if (dto.headers) updateData.headers = dto.headers as Prisma.InputJsonValue;
    if (dto.auth_type !== undefined) updateData.authType = dto.auth_type;
    if (dto.auth_config) updateData.authConfig = dto.auth_config as Prisma.InputJsonValue;
    if (dto.request_body) updateData.requestBody = dto.request_body as Prisma.InputJsonValue;
    if (dto.timeout) updateData.timeout = dto.timeout;
    if (dto.enabled !== undefined) updateData.enabled = dto.enabled;

    return this.prisma.externalApi.update({
      where: { id },
      data: updateData,
      include: {
        environment: {
          select: { id: true, name: true, code: true },
        },
        form: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.externalApi.delete({ where: { id } });
  }

  async invoke(id: string, dto: InvokeExternalApiDto) {
    const api = await this.findOne(id);

    if (!api.enabled) {
      throw new BadRequestException('API is disabled');
    }

    // Build URL
    const url = `${api.baseUrl}${api.endpoint}`;

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(api.headers as Record<string, string>),
      ...(dto.extra_headers || {}),
    };

    // Add auth headers
    const authConfig = api.authConfig as Record<string, unknown>;
    switch (api.authType) {
      case 'BEARER_TOKEN':
        if (authConfig?.token) {
          headers['Authorization'] = `Bearer ${authConfig.token}`;
        }
        break;
      case 'API_KEY':
        if (authConfig?.header_name && authConfig?.api_key) {
          headers[authConfig.header_name as string] = authConfig.api_key as string;
        }
        break;
      case 'BASIC':
        if (authConfig?.username && authConfig?.password) {
          const credentials = Buffer.from(
            `${authConfig.username}:${authConfig.password}`,
          ).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
      case 'OAUTH2_PASSWORD':
        // Login to get access token before making the API call
        const token = await this.getOAuth2Token(authConfig);
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        break;
    }

    // Build request body
    let body: string | undefined;
    if (api.method !== 'GET') {
      const requestBodyTemplate = api.requestBody as Record<string, unknown>;
      let bodyObj = { ...requestBodyTemplate };

      // Replace {{DATA}} placeholder with actual payload
      if (dto.payload) {
        bodyObj = this.replacePlaceholders(bodyObj, dto.payload);
      }

      body = JSON.stringify(bodyObj);
    }

    const startTime = Date.now();
    let status = 'SUCCESS';
    let response: unknown = null;
    let error: string | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), api.timeout);

      const fetchResponse = await fetch(url, {
        method: api.method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await fetchResponse.text();

      try {
        response = JSON.parse(responseText);
      } catch {
        response = responseText;
      }

      if (!fetchResponse.ok) {
        status = 'ERROR';
        error = `HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`;
      }
    } catch (err) {
      status = 'ERROR';
      error = err instanceof Error ? err.message : 'Unknown error';
    }

    const latencyMs = Date.now() - startTime;

    // Update last test status
    await this.prisma.externalApi.update({
      where: { id },
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: status,
      },
    });

    return {
      success: status === 'SUCCESS',
      status,
      latency_ms: latencyMs,
      response,
      error,
      request: {
        url,
        method: api.method,
        headers: this.maskSensitiveHeaders(headers),
        body: body ? JSON.parse(body) : null,
      },
    };
  }

  private async getOAuth2Token(authConfig: Record<string, unknown>): Promise<string | null> {
    const loginUrl = authConfig?.login_url as string;
    const email = authConfig?.email as string;
    const password = authConfig?.password as string;
    const tokenPath = (authConfig?.token_path as string) || 'accessToken';

    if (!loginUrl || !email || !password) {
      return null;
    }

    try {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        console.error(`OAuth2 login failed: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();

      // Navigate to token using tokenPath (supports nested paths like "data.accessToken")
      const pathParts = tokenPath.split('.');
      let token = data;
      for (const part of pathParts) {
        token = token?.[part];
      }

      return token as string || null;
    } catch (error) {
      console.error('OAuth2 login error:', error);
      return null;
    }
  }

  private replacePlaceholders(
    obj: Record<string, unknown>,
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value === '{{DATA}}') {
        result[key] = payload;
      } else if (typeof value === 'string' && value.includes('{{DATA}}')) {
        result[key] = value.replace('{{DATA}}', JSON.stringify(payload));
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.replacePlaceholders(value as Record<string, unknown>, payload);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private maskSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
    const masked = { ...headers };
    const sensitiveKeys = ['authorization', 'x-api-key', 'api-key'];

    for (const key of Object.keys(masked)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        masked[key] = '***MASKED***';
      }
    }

    return masked;
  }
}
