import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { map, tap } from "rxjs/operators";
import { safeLoad as YamlLoad } from "js-yaml";
import { forkJoin } from "rxjs";

@Injectable({
  providedIn: "root"
})
export class SchemaRepositoryService {

  schemas = {};

  constructor(
    private readonly http: HttpClient
  ) {}

  init() {
    const enabledSchemas = [ 'Person', 'Photo' ];
    return forkJoin(enabledSchemas.map(schemaName => this.http
      .get(`/assets/schemas/${schemaName}.yaml`, { responseType: 'text' })
      .pipe(
        map(text => YamlLoad(text)),
        tap(schema => this.schemas[schemaName] = schema)
      )))
      .toPromise();
  }

  getSchemaList() {
    return Object.keys(this.schemas);
  }

  getSchema(name: string) {
    return this.schemas[name];
  }
}