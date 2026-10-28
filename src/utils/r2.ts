import type { R2Bucket } from '@cloudflare/workers-types';

export interface Project {
  slug: string;
  title: string;
  coverImage: string;
  images: string[];
}

// Replace with your public R2 domain or Cloudflare R2 dev URL
const PUBLIC_R2_URL = 'https://assets.antoniosergiokoch.com';

function formatTitle(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function getAllProjects(r2Bucket: R2Bucket): Promise<Project[]> {
  console.log('=== [R2 DEBUG START] ===');
  
  if (!r2Bucket) {
    console.error('ERROR: R2 bucket binding is undefined or null!');
    console.log('=== [R2 DEBUG END] ===');
    return [];
  }

  const listed = await r2Bucket.list();
  
  console.log(`Total objects retrieved from R2: ${listed.objects.length}`);
  console.log('Object keys found in R2:', listed.objects.map((o) => o.key));

  const projectMap = new Map<string, string[]>();

  for (const object of listed.objects) {
    const parts = object.key.split('/');
    
    // Only process objects that are inside a folder (e.g. "project-folder/image.jpg")
    if (parts.length > 1) {
      const slug = parts[0];
      const filename = parts.slice(1).join('/');

      // Ignore empty folder placeholder objects or hidden files
      if (!filename || filename.startsWith('.')) continue;

      if (!projectMap.has(slug)) {
        projectMap.set(slug, []);
      }
      projectMap.get(slug)!.push(`${PUBLIC_R2_URL}/${encodeURI(object.key)}`);
    } else {
      console.log(`Skipping root file (not in a folder): "${object.key}"`);
    }
  }

  const projects: Project[] = [];

  for (const [slug, images] of projectMap.entries()) {
    // Sort filenames alphabetically (01_cover.jpg comes first)
    images.sort();

    const coverImage = images.find((img) => img.includes('cover')) || images[0];

    projects.push({
      slug,
      title: formatTitle(slug),
      coverImage,
      images
    });
  }

  console.log('Parsed Projects result:', projects);
  console.log('=== [R2 DEBUG END] ===');

  return projects;
}

export async function getProjectBySlug(r2Bucket: R2Bucket, slug: string): Promise<Project | null> {
  const projects = await getAllProjects(r2Bucket);
  return projects.find((p) => p.slug === slug) || null;
}