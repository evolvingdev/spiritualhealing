import { Inject, Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants.js';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { IS_PUBLIC_KEY, REQUIRED_PERMISSION_KEY } from './decorators.js';

/**
 * Refuses to start the app if any route declares neither `@Public()` nor `@RequirePermission()`,
 * so a forgotten decorator is caught at boot (and in every integration test), not in production.
 */
@Injectable()
export class RouteCoverageCheck implements OnApplicationBootstrap {
  constructor(
    @Inject(DiscoveryService) private readonly discovery: DiscoveryService,
    @Inject(MetadataScanner) private readonly scanner: MetadataScanner,
  ) {}

  onApplicationBootstrap(): void {
    const undeclared = this.findUndeclaredRoutes();
    if (undeclared.length > 0) {
      throw new Error(
        `Every route must declare @Public() or @RequirePermission(). Missing on: ${undeclared.join(', ')}`,
      );
    }
  }

  private findUndeclaredRoutes(): string[] {
    const undeclared: string[] = [];
    for (const wrapper of this.discovery.getControllers()) {
      const instance: unknown = wrapper.instance;
      const controller: unknown = wrapper.metatype;
      if (!isObject(instance) || typeof controller !== 'function') {
        continue;
      }
      const prototype: unknown = Object.getPrototypeOf(instance);
      if (!isObject(prototype)) {
        continue;
      }
      for (const methodName of this.scanner.getAllMethodNames(prototype)) {
        const handler: unknown = Reflect.get(prototype, methodName);
        if (typeof handler !== 'function' || !isRouteHandler(handler)) {
          continue;
        }
        if (!hasAccessDeclaration(handler) && !hasAccessDeclaration(controller)) {
          undeclared.push(`${wrapper.name}.${methodName}`);
        }
      }
    }
    return undeclared;
  }
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

function isRouteHandler(handler: object): boolean {
  return Reflect.getMetadata(PATH_METADATA, handler) !== undefined;
}

function hasAccessDeclaration(target: object): boolean {
  return (
    Reflect.getMetadata(IS_PUBLIC_KEY, target) === true ||
    Reflect.getMetadata(REQUIRED_PERMISSION_KEY, target) !== undefined
  );
}
