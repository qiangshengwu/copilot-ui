import {paths as copilotPaths} from '@/types/copilot';
import createClient from 'openapi-fetch';
import {interceptorFetch} from './responseInterceptor';

export function copilotClient() {
    return createClient<copilotPaths>({
        fetch: interceptorFetch,
    });
}
