interface ImportMetaEnv {
  /** The API's address, such as https://portfolio-api.example.workers.dev. Optional. */
  readonly PUBLIC_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
