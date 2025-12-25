import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
    code: number;
    error: boolean;
    errors: string[];
    message: string;
    data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
        return next.handle().pipe(
            map((data) => {
                const response = context.switchToHttp().getResponse();
                const statusCode = response.statusCode;

                // Jika data sudah punya format message (dari service), gunakan itu
                if (data && typeof data === 'object' && 'message' in data && Object.keys(data).length === 1) {
                    return {
                        code: statusCode,
                        error: false,
                        errors: [],
                        message: data.message,
                        data: null,
                    };
                }

                // Jika data punya meta (pagination), preserve struktur
                if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
                    return {
                        code: statusCode,
                        error: false,
                        errors: [],
                        message: 'Data retrieved successfully',
                        data: data.data,
                        meta: data.meta,
                    } as any;
                }

                return {
                    code: statusCode,
                    error: false,
                    errors: [],
                    message: 'Data retrieved successfully',
                    data,
                };
            }),
        );
    }
}
