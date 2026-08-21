import { connectToDatabase } from './db';
import { Site } from './models/Site';
import { User } from './models/User';
import { serializeSite, serializeUser } from './serialize';
import type { IUser } from './models/User';
import type { SiteDTO, UserDTO } from './types';

/**
 * Filter dropdowns and assignment pickers need the same two lists on several
 * pages, so they are loaded together here.
 */
export async function getDirectory(user: IUser): Promise<{
  sites: SiteDTO[];
  agents: UserDTO[];
}> {
  await connectToDatabase();

  const [sites, agents] = await Promise.all([
    Site.find({}).select('name domain').sort({ name: 1 }).lean(),
    // Only administrators assign work, so agents get an empty list.
    user.role === 'admin'
      ? User.find({ isActive: true })
          .select('name email role isActive createdAt')
          .sort({ name: 1 })
          .lean()
      : Promise.resolve([]),
  ]);

  return {
    sites: sites.map(serializeSite),
    agents: agents.map(serializeUser),
  };
}
