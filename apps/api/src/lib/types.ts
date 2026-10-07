/** What every request carries on its context. `requestId` is set for every request. */
export interface AppBindings {
  Variables: {
    requestId: string;
  };
}
