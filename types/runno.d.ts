// runno.d.ts
declare module "@antonz/runno" {
  // export interface WASIResult {
  //   exitCode: number;
  //   // Include other properties of the result as needed
  // }

  export interface WASIStartOptions {
    args: string[];
    stdout: (out: any) => void;
    stderr: (err: any) => void;
  }

  // If WASI is being imported directly and used for its static start method,
  // ensure that the class is exported and the start method is declared as static.
  export class WASI {
    static start(
      wasmModulePromise: Promise<Response>,
      options: WASIStartOptions
    ): Promise<WASIResult>;
  }
}
