/**
 * Helper function to retry API calls when they fail
 * @param apiCallFn Function that makes the API call
 * @param maxRetries Maximum number of retry attempts
 * @param initialDelay Initial delay in ms before retrying
 * @returns Result of the API call
 */
export async function withRetry<T>(
  apiCallFn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 2000
): Promise<T> {
  let lastError: Error | null = null;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt}/${maxRetries}...`);
      }
      return await apiCallFn();
    } catch (error: any) {
      lastError = error;
      console.error(`Error on attempt ${attempt}/${maxRetries}: ${error.message}`);
      
      if (attempt < maxRetries) {
        console.log(`Waiting ${delay/1000} seconds before retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = delay * 1.5 + Math.floor(Math.random() * 1000);
      }
    }
  }
  
  throw lastError || new Error('Maximum retries exceeded');
} 