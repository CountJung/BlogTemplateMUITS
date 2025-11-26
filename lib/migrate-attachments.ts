// lib/migrate-attachments.ts
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export function migrateAttachmentUrls() {
  const postsDirectory = path.join(process.cwd(), 'content', 'posts');
  
  if (!fs.existsSync(postsDirectory)) {
    return;
  }

  const filenames = fs.readdirSync(postsDirectory);
  
  filenames.forEach(filename => {
    if (!filename.endsWith('.md')) return;
    
    const filePath = path.join(postsDirectory, filename);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const matterResult = matter(fileContents);
    
    if (matterResult.data.attachments && Array.isArray(matterResult.data.attachments)) {
      let updated = false;
      
      matterResult.data.attachments = matterResult.data.attachments.map((attachment: any) => {
        if (attachment.url && attachment.url.startsWith('/uploads/')) {
          const filename = attachment.url.replace('/uploads/', '');
          attachment.url = `/api/files/${filename}`;
          attachment.downloadUrl = `/api/files/${filename}?download=true`;
          updated = true;
        }
        return attachment;
      });
      
      if (updated) {
        const newContent = matter.stringify(matterResult.content, matterResult.data);
        fs.writeFileSync(filePath, newContent);
        console.log(`Updated attachments in: ${filename}`);
      }
    }
  });
}