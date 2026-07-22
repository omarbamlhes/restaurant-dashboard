import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface MoyasarPayment {
  id: string;
  status: 'initiated' | 'paid' | 'failed' | 'authorized' | 'captured' | 'refunded' | 'voided';
  amount: number;
  fee: number;
  currency: string;
  description: string;
  source: {
    type: string;
    company: string;
    name: string;
    number: string;
    message: string;
    transaction_url?: string;
    token?: string;
  };
  metadata?: Record<string, string>;
  callback_url: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class MoyasarService {
  private readonly logger = new Logger(MoyasarService.name);
  private readonly client: AxiosInstance;

  constructor() {
    const secretKey = process.env.MOYASAR_SECRET_KEY;
    if (!secretKey) {
      this.logger.warn('MOYASAR_SECRET_KEY is not set. Payment processing will not work.');
    }

    this.client = axios.create({
      baseURL: 'https://api.moyasar.com/v1',
      auth: {
        username: secretKey || '',
        password: '',
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async fetchPayment(paymentId: string): Promise<MoyasarPayment> {
    try {
      const { data } = await this.client.get(`/payments/${paymentId}`);
      return data;
    } catch (error: any) {
      this.logger.error(`Failed to fetch payment ${paymentId}: ${error.message}`);
      if (error.response?.status === 404) {
        throw new BadRequestException('عملية الدفع غير موجودة');
      }
      throw new InternalServerErrorException('فشل في التحقق من عملية الدفع');
    }
  }

  async refundPayment(paymentId: string, amountInHalalas?: number): Promise<MoyasarPayment> {
    try {
      const body: any = {};
      if (amountInHalalas) {
        body.amount = amountInHalalas;
      }
      const { data } = await this.client.post(`/payments/${paymentId}/refund`, body);
      return data;
    } catch (error: any) {
      this.logger.error(`Failed to refund payment ${paymentId}: ${error.message}`);
      throw new InternalServerErrorException('فشل في استرداد المبلغ');
    }
  }

  sarToHalalas(amountSAR: number | string): number {
    return Math.round(parseFloat(String(amountSAR)) * 100);
  }

  getPublishableKey(): string {
    return process.env.MOYASAR_PUBLISHABLE_KEY || '';
  }

  getCallbackUrl(): string {
    return process.env.MOYASAR_CALLBACK_URL || 'http://localhost:3000/settings/billing/callback';
  }
}
