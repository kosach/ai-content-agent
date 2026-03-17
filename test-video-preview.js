// Test video preview in draft generation
require('fs').readFileSync('.env', 'utf8')
  .split('\n')
  .filter(line => line && !line.startsWith('#') && line.includes('='))
  .forEach(line => {
    const [key, ...values] = line.split('=');
    process.env[key.trim()] = values.join('=').trim();
  });

const { database } = require('./packages/database/dist');
const { queueService } = require('./packages/queue/dist');
const { JobType } = require('./packages/core/dist');

async function test() {
  console.log('🎬 Testing Draft Generation with Video Preview\n');
  
  try {
    const sessionId = 'cmmuwg68x0001vsdmo24ceosh';
    
    const session = await database.contentSession.findUnique({
      where: { id: sessionId },
      include: {
        mediaAssets: {
          where: { analyzed: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    const primaryVideo = session.mediaAssets.find(m => m.type === 'VIDEO');
    const primaryImage = session.mediaAssets.find(m => m.type === 'PHOTO');
    
    console.log('Session:', session.id);
    console.log('Video:', primaryVideo ? `${primaryVideo.fileSize} bytes, ${primaryVideo.duration}s` : 'NONE');
    console.log('Image:', primaryImage ? `${primaryImage.fileSize} bytes` : 'NONE');
    console.log('');
    
    if (!primaryVideo && !primaryImage) {
      throw new Error('No media found!');
    }
    
    // Enqueue new job
    console.log('Enqueuing draft generation job...');
    
    const jobData = {
      sessionId: session.id,
      brandProfileId: session.brandProfileId,
      userIntent: session.userIntent || 'Test',
      tone: session.tone || 'Professional',
      mediaAnalysis: session.mediaAssets[0].analysisResult,
    };
    
    await queueService.enqueue(JobType.GENERATE_DRAFTS, jobData);
    
    console.log('✅ Job enqueued!');
    console.log('');
    console.log('Check your Telegram - should receive:');
    console.log('  1. Video preview message');
    console.log('  2. Draft texts with buttons');
    console.log('');
    console.log('Watch logs/generation.log for details...');
    
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await database.$disconnect();
  }
}

test();
