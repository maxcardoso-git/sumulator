import { Controller, All, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { SimulatedApiService } from './simulated-api.service';

@ApiTags('sim-proxy')
@Controller('sim-proxy')
export class SimulatedApiProxyController {
  constructor(private simulatedApiService: SimulatedApiService) {}

  @All('*')
  @ApiExcludeEndpoint()
  async handleProxy(@Req() req: Request, @Res() res: Response) {
    const path = req.path.replace('/api/v1/simulator/sim-proxy', '');
    const method = req.method;

    const endpoint = await this.simulatedApiService.findByMethodAndPath(method, path);

    if (!endpoint) {
      return res.status(404).json({
        error: 'Endpoint not found',
        message: `No simulated endpoint configured for ${method} ${path}`,
      });
    }

    const result = await this.simulatedApiService.executeEndpoint(endpoint, {
      method,
      path,
      headers: req.headers as Record<string, string>,
      body: req.body || {},
      query: req.query as Record<string, string>,
    });

    return res.status(result.status).json(result.body);
  }
}
