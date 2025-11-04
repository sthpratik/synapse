import { SynapseConfig, GeneratedParameter } from '../types/config';

export class UrlConstructor {
  constructor(private config: SynapseConfig) {}

  constructUrl(parameters: GeneratedParameter[]): string {
    const url = new URL(this.config.baseUrl);
    
    // Add parameters as query parameters
    parameters.forEach(param => {
      url.searchParams.append(param.name, param.value.toString());
    });
    
    return url.toString();
  }

  constructUrls(parameterSets: GeneratedParameter[][]): string[] {
    return parameterSets.map(params => this.constructUrl(params));
  }

  // For path parameters (e.g., /users/{userId}/posts/{postId})
  constructUrlWithPathParams(parameters: GeneratedParameter[]): string {
    let url = this.config.baseUrl;
    const queryParams = new URLSearchParams();
    
    parameters.forEach(param => {
      const placeholder = `{${param.name}}`;
      if (url.includes(placeholder)) {
        // Replace path parameter
        url = url.replace(placeholder, param.value.toString());
      } else {
        // Add as query parameter
        queryParams.append(param.name, param.value.toString());
      }
    });
    
    // Append query parameters if any
    const queryString = queryParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
    
    return url;
  }
}
