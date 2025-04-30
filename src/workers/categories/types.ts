/// <reference types="@cloudflare/workers-types" />

export interface Env {
  CATEGORIES: KVNamespace;
  IMAGES: R2Bucket;
} 