declare module '*?worker' {
  const WorkerFactory: { new (): Worker };
  export default WorkerFactory;
}
declare const __LEUCHTWEGE_DEVTOOLS__: boolean;
