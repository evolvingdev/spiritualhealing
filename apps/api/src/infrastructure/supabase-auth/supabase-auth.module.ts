import { Global, Module } from '@nestjs/common';
import { SUPABASE_AUTH } from './supabase-auth.js';
import { SupabaseAuthClient } from './supabase-auth.client.js';

@Global()
@Module({
  providers: [{ provide: SUPABASE_AUTH, useClass: SupabaseAuthClient }],
  exports: [SUPABASE_AUTH],
})
export class SupabaseAuthModule {}
