import { DrizzleService } from '@kizunu/nestjs-shared/modules/persistence/services/drizzle.service'
import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { type Workspace, workspaces } from '../../../db/schemas/workspaces'

@Injectable()
export class WorkspaceRepository {
  constructor(private readonly drizzle: DrizzleService) {}

  async findById(id: string): Promise<Workspace | undefined> {
    const rows = await this.drizzle.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id))
      .limit(1)
    return rows[0]
  }
}
