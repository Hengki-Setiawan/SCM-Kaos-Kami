export function logError(error: any, context: string) {
  const timestamp = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : '';
  
  console.error(`[${timestamp}] [${context}] ERROR: ${message}`, stack);
  
  // Potential future: Save to database 'error_logs' table
  // try {
  //   db.insert(errorLogs).values({ timestamp, context, message, stack });
  // } catch(e) {}
}

export function logInfo(message: string, context: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${context}] INFO: ${message}`);
}
