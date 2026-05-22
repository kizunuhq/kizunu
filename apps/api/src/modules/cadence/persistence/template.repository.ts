import { templates } from '@kizunu/api/db/schemas/templates'
import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'

export interface TemplateRow {
  id: string
  name: string
  channelPluginId: string
  providerTemplateName: string
  language: string
  variables: string[]
}

export interface TemplatePatch {
  name?: string
  channelPluginId?: string
  providerTemplateName?: string
  language?: string
  variables?: string[]
}

const columns = {
  id: templates.id,
  name: templates.name,
  channelPluginId: templates.channelPluginId,
  providerTemplateName: templates.providerTemplateName,
  language: templates.language,
  variables: templates.variables,
}

@Injectable()
export class TemplateRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(input: {
    workspaceId: string
    name: string
    channelPluginId: string
    providerTemplateName: string
    language: string
    variables: string[]
  }): Promise<{ id: string }> {
    const rows = await this.drizzle.db
      .insert(templates)
      .values(input)
      .returning({ id: templates.id })
    const created = rows[0]
    if (!created) throw new Error('Failed to create template')
    return created
  }

  async findByName(workspaceId: string, name: string): Promise<{ id: string } | undefined> {
    const rows = await this.drizzle.db
      .select({ id: templates.id })
      .from(templates)
      .where(and(eq(templates.workspaceId, workspaceId), eq(templates.name, name)))
      .limit(1)
    return rows[0]
  }

  async findByIdInWorkspace(id: string, workspaceId: string): Promise<TemplateRow | undefined> {
    const rows = await this.drizzle.db
      .select(columns)
      .from(templates)
      .where(and(eq(templates.id, id), eq(templates.workspaceId, workspaceId)))
      .limit(1)
    return rows[0]
  }

  async listByWorkspace(workspaceId: string): Promise<TemplateRow[]> {
    return await this.drizzle.db
      .select(columns)
      .from(templates)
      .where(eq(templates.workspaceId, workspaceId))
  }

  async update(id: string, patch: TemplatePatch): Promise<void> {
    await this.drizzle.db.update(templates).set(patch).where(eq(templates.id, id))
  }

  async delete(id: string): Promise<void> {
    await this.drizzle.db.delete(templates).where(eq(templates.id, id))
  }
}
