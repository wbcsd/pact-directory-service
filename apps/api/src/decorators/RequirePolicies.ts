import "reflect-metadata";
import { RequestHandler } from "express";

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

export function getHandlerPolicies(
  handler: RequestHandler
): string[] | undefined {
  return Reflect.getMetadata(POLICIES_KEY, handler) as string[] | undefined;
}
