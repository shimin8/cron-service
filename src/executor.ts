import axios, { Method, AxiosRequestConfig } from 'axios';

// Define the structure for an API call task
interface ApiTaskConfig {
    url: string;
    method: Method; // Axios's type for HTTP methods (GET, POST, etc.)
    headers?: Record<string, string>;
    data?: any;
    params?: any;
}

// Define the data received by the executor
interface JobPayload {
    type: 'API_CALL' | 'INTERNAL_SCRIPT' | 'OTHER'; // Type of task
    config: ApiTaskConfig | any;
}

/**
 * Executes an HTTP API call based on the provided configuration.
 * @param config - The ApiTaskConfig object from the job payload.
 * @returns A summary string of the execution result.
 */
async function executeApiCall(config: ApiTaskConfig): Promise<string> {
    const { url, method, headers, data, params } = config;
    
    // Axios request configuration
    const requestConfig: AxiosRequestConfig = {
        url,
        method,
        headers,
        data,
        params,
        // Standard timeout to prevent indefinite blocking
        timeout: 30000 
    };

    console.log(`[Executor] Making ${method} request to: ${url}`);
    
    try {

        const response = await axios(requestConfig);

        if (response.status >= 200 && response.status < 300) {
            const logMessage = `API Call SUCCESS. Status: ${response.status}. Data length: ${JSON.stringify(response.data).length} chars.`;
            console.log(`[Executor] ${logMessage}`);
            return logMessage;
        } else {
            const failureMessage = `API Call FAILED. Received unexpected status code: ${response.status}.`;
            console.error(`[Executor] ${failureMessage}`);
            throw new Error(failureMessage);
        }
    } catch (error: any) {
        const errorDetail = error.response ? 
            `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data).substring(0, 100)}...` : 
            error.message;
        
        const errorMessage = `API Call execution FAILED. ${errorDetail}`;
        console.error(`[Executor] ${errorMessage}`);
        
        throw new Error(errorMessage);
    }
}

/**
 * Main function to route job execution based on type.
 * @param jobPayload - The payload from the scheduled job.
 * @returns A summary string of the execution result.
 */
export async function executeJob(jobPayload: JobPayload): Promise<string> {
    if (jobPayload.type === 'API_CALL') {
        const config = jobPayload.config as ApiTaskConfig;
        if (!config || !config.url || !config.method) {
            throw new Error("API_CALL task missing required 'url' or 'method' in config.");
        }
        return executeApiCall(config);
    }
    
    throw new Error(`Unsupported job type: ${jobPayload.type}`);
}