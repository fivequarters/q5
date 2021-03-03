import {Dist, Packument, PackumentVersion} from "@npm/types";
import {Request} from "express";
import {IRegistryStore} from "@5qtrs/registry";

export interface IPackument extends Omit<Packument, "versions">{
  _attachments: { [key: string]: {data: string, length: number} },
  _rev: string,
  etag: string,
  versions: {[key: string]: IPackumentVersion},
  date: string
}

export interface IPackumentVersion extends Omit<PackumentVersion, "dist"> {
  dist: IDist
}

export interface IDist extends Omit<Dist, "tarball"> {
  tarball: {
    scope: string,
    name: string,
    version: string
  }
}

export interface IFunctionApiRequest extends Request {
  resolvedAgent: string;
  registry: IRegistryStore;
  tarballRootUrl?: string;
}