import { Exception } from '@5qtrs/exception';

// -------------------
// Exported Interfaces
// -------------------

export enum AwsAlbExceptionCode {
  noAlb = 'noAlb',
  noHttpsListener = 'noHttpsListener',
  noTargetGroup = 'noTargetGroup',
  hostRequired = 'hostRequired',
}

// ----------------
// Exported Classes
// ----------------

export class AwsAlbException extends Exception {
  public static noAlb(name: string) {
    const message = `The application load balancer with the name '${name}' does not exist`;
    return new AwsAlbException(AwsAlbExceptionCode.noAlb, message, [name]);
  }

  public static noTargetGroup(name: string, targetGroupName: string) {
    const message = [
      `The application load balancer with the name '${name}'`,
      `does not have a target group with the name '${targetGroupName}`,
    ].join(' ');
    return new AwsAlbException(AwsAlbExceptionCode.noTargetGroup, message, [name, targetGroupName]);
  }

  public static noHttpsListener(name: string) {
    const message = `The application load balancer with the name '${name}' does not have an HTTPS listener`;
    return new AwsAlbException(AwsAlbExceptionCode.noHttpsListener, message, [name]);
  }

  public static hostRequired(name: string, targetGroupName: string) {
    const message = [
      `Those property is required when adding the target group '${targetGroupName}'`,
      `to the application load balancer with name '${name}'`,
    ].join(' ');
    return new AwsAlbException(AwsAlbExceptionCode.hostRequired, message, [targetGroupName, name]);
  }

  private constructor(code: string, message?: string, params?: any[], inner?: Error | Exception) {
    super(code, message, params, inner);
  }
}
