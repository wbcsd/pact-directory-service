import "reflect-metadata";

const POLICIES_KEY = Symbol("policies");

export function RequirePolicies({ policies }: { policies: string[] }) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    Reflect.defineMetadata(POLICIES_KEY, policies, descriptor.value);
    return descriptor;
  };
}

export function getHandlerPolicies(handler: Function): string[] | undefined {
  return Reflect.getMetadata(POLICIES_KEY, handler);
}
