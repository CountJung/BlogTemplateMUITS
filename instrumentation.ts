export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initLogger } = await import('./lib/logger');
    const { initScheduler } = await import('./lib/scheduler');
    
    initLogger();
    initScheduler();
  }
}
