import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import ENV from '../config';
import type { ApiResponse } from '../types';

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Invalid request',
  403: 'Access denied',
  404: 'Not found',
  409: 'Conflict — this action was already performed',
  422: 'Validation error',
  429: 'Too many requests. Please try again later.',
  500: 'Server error. Please try again.',
};

class ApiClient {
  private readonly instance: AxiosInstance;
  private tokenProvider: (() => Promise<string | null>) | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: ENV.API_BASE_URL,
      timeout: 15_000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.instance.interceptors.request.use(this.attachToken, (error) => Promise.reject(error));
    this.instance.interceptors.response.use(this.handleResponse, this.handleError);
  }

  public setTokenProvider(provider: (() => Promise<string | null>) | null) {
    this.tokenProvider = provider;
  }

  private attachToken = async (config: InternalAxiosRequestConfig) => {
    if (this.tokenProvider) {
      try {
        const token = await this.tokenProvider();
        console.log('--- Axios Interceptor ---');
        console.log('Resolving Token: ', token ? token.substring(0, 20) + '...' : 'NULL');

        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (e) {
        console.log('Failed to fetch clerk token:', e);
      }
    } else {
      console.log('--- Axios Interceptor --- No tokenProvider set!');
    }
    return config;
  };

  private handleResponse = (response: AxiosResponse<ApiResponse<any>>) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body) {
      if (!body.success) {
        return Promise.reject(new Error(body.error || 'Request failed'));
      }
      return body.data;
    }
    return body;
  };

  private handleError = async (error: AxiosError<ApiResponse<any>>) => {
    const errorMessage = this.extractErrorMessage(error);
    return Promise.reject(new Error(errorMessage));
  };

  private extractErrorMessage(error: AxiosError<ApiResponse<any>>): string {
    if (error.response?.data?.error) return error.response.data.error;
    if (error.response?.status) return STATUS_MESSAGES[error.response.status] || 'Something went wrong';
    if (error.code === 'ECONNABORTED') return 'Request timed out.';
    if (!error.response) return 'Network error.';
    return 'Something went wrong';
  }

  get<T>(url: string, params?: Record<string, any>) {
    return this.instance.get<any, T>(url, { params });
  }

  post<T>(url: string, data?: any) {
    return this.instance.post<any, T>(url, data);
  }

  put<T>(url: string, data?: any) {
    return this.instance.put<any, T>(url, data);
  }

  patch<T>(url: string, data?: any) {
    return this.instance.patch<any, T>(url, data);
  }

  delete<T>(url: string) {
    return this.instance.delete<any, T>(url);
  }
}

const api = new ApiClient();
export default api;
