import { Prisma } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GenerateDomainDto } from './dto/generate-domain.dto';
import { CreateConceptDto } from './dto/create-concept.dto';
import { CreateRelationDto } from './dto/create-relation.dto';

// Predefined domain templates
const DOMAIN_TEMPLATES: Record<string, {
  concepts: Array<{ code: string; label: string; description: string }>;
  relations: Array<{ from: string; to: string; type: string }>;
  synonyms: Record<string, string[]>;
}> = {
  finance: {
    concepts: [
      { code: 'transaction', label: 'Transação', description: 'Operação financeira' },
      { code: 'payment', label: 'Pagamento', description: 'Transação de pagamento' },
      { code: 'refund', label: 'Estorno', description: 'Devolução de valor' },
      { code: 'account', label: 'Conta', description: 'Conta bancária ou de serviço' },
      { code: 'balance', label: 'Saldo', description: 'Saldo disponível' },
      { code: 'customer', label: 'Cliente', description: 'Pessoa física ou jurídica' },
      { code: 'invoice', label: 'Fatura', description: 'Documento de cobrança' },
      { code: 'credit_card', label: 'Cartão de Crédito', description: 'Meio de pagamento' },
      { code: 'debit_card', label: 'Cartão de Débito', description: 'Meio de pagamento' },
      { code: 'pix', label: 'PIX', description: 'Transferência instantânea' },
    ],
    relations: [
      { from: 'payment', to: 'transaction', type: 'is_a' },
      { from: 'refund', to: 'transaction', type: 'is_a' },
      { from: 'customer', to: 'account', type: 'has' },
      { from: 'account', to: 'balance', type: 'has' },
      { from: 'transaction', to: 'account', type: 'affects' },
      { from: 'invoice', to: 'payment', type: 'generates' },
    ],
    synonyms: {
      transaction: ['transação', 'operação', 'movimentação'],
      payment: ['pagamento', 'pagar', 'quitar'],
      refund: ['estorno', 'devolução', 'reembolso', 'devolver'],
      balance: ['saldo', 'disponível', 'valor em conta'],
      invoice: ['fatura', 'boleto', 'conta', 'cobrança'],
    },
  },
  customer_service: {
    concepts: [
      { code: 'ticket', label: 'Chamado', description: 'Solicitação de atendimento' },
      { code: 'agent', label: 'Agente', description: 'Atendente humano' },
      { code: 'customer', label: 'Cliente', description: 'Solicitante do atendimento' },
      { code: 'sla', label: 'SLA', description: 'Acordo de nível de serviço' },
      { code: 'resolution', label: 'Resolução', description: 'Solução do problema' },
      { code: 'escalation', label: 'Escalação', description: 'Encaminhamento para nível superior' },
      { code: 'feedback', label: 'Feedback', description: 'Avaliação do atendimento' },
      { code: 'queue', label: 'Fila', description: 'Fila de atendimento' },
    ],
    relations: [
      { from: 'customer', to: 'ticket', type: 'creates' },
      { from: 'agent', to: 'ticket', type: 'handles' },
      { from: 'ticket', to: 'resolution', type: 'leads_to' },
      { from: 'ticket', to: 'escalation', type: 'may_trigger' },
      { from: 'ticket', to: 'sla', type: 'subject_to' },
    ],
    synonyms: {
      ticket: ['chamado', 'solicitação', 'protocolo', 'atendimento'],
      agent: ['agente', 'atendente', 'operador'],
      resolution: ['resolução', 'solução', 'resolver', 'resolvido'],
      escalation: ['escalação', 'escalar', 'encaminhar', 'supervisor'],
    },
  },
};

@Injectable()
export class SemanticDomainService {
  constructor(private prisma: PrismaService) {}

  async generate(dto: GenerateDomainDto) {
    const template = DOMAIN_TEMPLATES[dto.domain];

    if (!template) {
      return {
        error: `Domain template "${dto.domain}" not found. Available: ${Object.keys(DOMAIN_TEMPLATES).join(', ')}`,
      };
    }

    let conceptsCreated = 0;
    let relationsCreated = 0;
    let synonymsCreated = 0;

    // Create concepts
    const conceptMap: Record<string, string> = {};

    for (const concept of template.concepts) {
      const existing = await this.prisma.domainConcept.findFirst({
        where: { domain: dto.domain, code: concept.code },
      });

      if (existing) {
        conceptMap[concept.code] = existing.id;
        continue;
      }

      const created = await this.prisma.domainConcept.create({
        data: {
          domain: dto.domain,
          code: concept.code,
          label: concept.label,
          description: concept.description,
          attributes: {},
        },
      });

      conceptMap[concept.code] = created.id;
      conceptsCreated++;
    }

    // Create relations
    if (dto.include_relations) {
      for (const relation of template.relations) {
        const fromId = conceptMap[relation.from];
        const toId = conceptMap[relation.to];

        if (!fromId || !toId) continue;

        const existing = await this.prisma.domainRelation.findFirst({
          where: {
            fromConceptId: fromId,
            toConceptId: toId,
            relationType: relation.type,
          },
        });

        if (!existing) {
          await this.prisma.domainRelation.create({
            data: {
              fromConceptId: fromId,
              toConceptId: toId,
              relationType: relation.type,
              metadata: {},
            },
          });
          relationsCreated++;
        }
      }
    }

    // Create synonyms
    if (dto.include_synonyms) {
      for (const [conceptCode, terms] of Object.entries(template.synonyms)) {
        const conceptId = conceptMap[conceptCode];
        if (!conceptId) continue;

        for (const term of terms) {
          const existing = await this.prisma.synonym.findFirst({
            where: { conceptId, term },
          });

          if (!existing) {
            await this.prisma.synonym.create({
              data: {
                conceptId,
                term,
                language: dto.language || 'pt-BR',
                weight: 1.0,
              },
            });
            synonymsCreated++;
          }
        }
      }
    }

    return {
      concepts_created: conceptsCreated,
      relations_created: relationsCreated,
      synonyms_created: synonymsCreated,
    };
  }

  async getConcepts(domain?: string) {
    const where = domain ? { domain } : {};
    return this.prisma.domainConcept.findMany({
      where,
      include: {
        synonyms: true,
        relationsFrom: {
          include: { toConcept: { select: { code: true, label: true } } },
        },
        relationsTo: {
          include: { fromConcept: { select: { code: true, label: true } } },
        },
      },
      orderBy: [{ domain: 'asc' }, { code: 'asc' }],
    });
  }

  async getConceptById(id: string) {
    const concept = await this.prisma.domainConcept.findUnique({
      where: { id },
      include: {
        synonyms: true,
        relationsFrom: {
          include: { toConcept: true },
        },
        relationsTo: {
          include: { fromConcept: true },
        },
      },
    });

    if (!concept) {
      throw new NotFoundException(`Concept "${id}" not found`);
    }

    return concept;
  }

  async createConcept(dto: CreateConceptDto) {
    return this.prisma.domainConcept.create({
      data: {
        domain: dto.domain,
        code: dto.code,
        label: dto.label,
        description: dto.description,
        attributes: (dto.attributes || {}) as Prisma.InputJsonValue,
      },
    });
  }

  async createRelation(dto: CreateRelationDto) {
    return this.prisma.domainRelation.create({
      data: {
        fromConceptId: dto.from_concept_id,
        toConceptId: dto.to_concept_id,
        relationType: dto.relation_type,
        metadata: (dto.metadata || {}) as Prisma.InputJsonValue,
      },
    });
  }

  async addSynonym(conceptId: string, term: string, language: string = 'pt-BR') {
    return this.prisma.synonym.create({
      data: {
        conceptId,
        term,
        language,
        weight: 1.0,
      },
    });
  }

  async getOntologyGraph(domain: string) {
    const concepts = await this.prisma.domainConcept.findMany({
      where: { domain },
      include: {
        relationsFrom: true,
      },
    });

    const nodes = concepts.map((c) => ({
      id: c.id,
      code: c.code,
      label: c.label,
    }));

    const edges = concepts.flatMap((c) =>
      c.relationsFrom.map((r) => ({
        from: r.fromConceptId,
        to: r.toConceptId,
        type: r.relationType,
      })),
    );

    return { nodes, edges };
  }
}
