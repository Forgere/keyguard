import axios from 'axios';

export interface ProxyRequestOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  data?: any;
}

export class ProxyHandler {
  // 预定义服务的基础 URL
  private static serviceBaseUrls: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    github: 'https://api.github.com',
    cloudflare: 'https://api.cloudflare.com/client/v4',
    vercel: 'https://api.vercel.com',
    supabase: 'https://api.supabase.com/v1',
  };

  static async forward(service: string, key: string, options: ProxyRequestOptions) {
    const baseUrl = this.serviceBaseUrls[service.toLowerCase()];
    if (!baseUrl) {
      throw new Error(`Unsupported service for proxy: ${service}`);
    }

    // 构造完整 URL
    const fullUrl = options.url.startsWith('http') ? options.url : `${baseUrl}${options.url.startsWith('/') ? '' : '/'}${options.url}`;

    // 构造请求头，注入原始 Key
    const headers: Record<string, string> = { ...options.headers };
    
    if (service.toLowerCase() === 'openai' || 
        service.toLowerCase() === 'cloudflare' || 
        service.toLowerCase() === 'vercel' || 
        service.toLowerCase() === 'supabase') {
      headers['Authorization'] = `Bearer ${key}`;
    } else if (service.toLowerCase() === 'anthropic') {
      headers['x-api-key'] = key;
      headers['anthropic-version'] = '2023-06-01';
    } else if (service.toLowerCase() === 'github') {
      headers['Authorization'] = `token ${key}`;
      headers['Accept'] = 'application/vnd.github.v3+json';
    }

    try {
      const response = await axios({
        method: options.method,
        url: fullUrl,
        headers,
        data: options.data,
        validateStatus: () => true, // 允许返回非 2xx 状态码
      });

      return {
        status: response.status,
        data: response.data,
        headers: response.headers,
      };
    } catch (error: any) {
      return {
        status: 500,
        error: error.message,
      };
    }
  }
}
