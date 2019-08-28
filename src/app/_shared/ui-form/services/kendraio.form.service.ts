import { Injectable } from '@angular/core';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { FormlyJsonschema } from '@ngx-formly/core/json-schema';
// import { Field } from '../helpers/fields';
// import { DEFAULT_FORM } from '../schemas/default.form';
// import { LOGIN_FORM } from '../schemas/login.form';
// import { FORMS_VALUES } from '../schemas';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

// import { FULLNAME, EMAIL, TYPEAHEAD } from '../schemas/form-elements';
import { Observable, from, forkJoin, throwError } from 'rxjs';
import { FORM_APIS, REFDATA_APIS } from '../api-config';
import { catchError, map, tap } from 'rxjs/operators';
import {get, set, has, findIndex, isObject} from 'lodash-es';
import { AdaptersService } from '../../../services/adapters.service';
import { IfStmt } from '@angular/compiler';
import { ConfigOption } from '@ngx-formly/core';

const ADAPTER_PREFIX = 'https://kendraio.github.io/kendraio-adapter/';

@Injectable({
  providedIn: 'root'
})
export class KendraioFormService {

  constructor(
    private http: HttpClient,
    private formlyJsonschema: FormlyJsonschema,
    private adapters: AdaptersService,
    // private config: ConfigOption
  ) { }

  getFormData(groupId, formId): Observable<any> {
    return forkJoin([this.getUI(groupId, formId), this.getSchema(groupId, formId)]);
  }

  getUI(groupId: string, formId: string): Observable<any> {
    // console.log(this.adapters.getAdapterSync(groupId));
    // TODO: fetch remote form config if not found in FORM_APIS
    // TODO: This working but is not very robust
    const url = has(FORM_APIS, `${groupId}.${formId}.uiSchema`)
      ? FORM_APIS[groupId][formId].uiSchema
      : ADAPTER_PREFIX + this.adapters.getAdapterSync(groupId)['adapter']['forms'][formId].uiSchema;

    return this.http.get(url)
      .pipe(catchError(this.errorHandler));
  }

  getJSONSchemaForm(_adapter, _formId) {
    return this.getFormData(_adapter, _formId).pipe(
      map(([uiSchema, jsonSchema]) => ({ uiSchema, jsonSchema })),
      map(({ uiSchema, jsonSchema }) => this.jsonSchemaToFieldConfig({ uiSchema, jsonSchema })),
      map(({ fields, uiSchema }) => this.uiWidgetTypeMapper({ fields, uiSchema })),
      map((fields) => [fields])
    );
  }

  schemasToFieldConfig(jsonSchema, uiSchema) {
    const { fields } = this.jsonSchemaToFieldConfig({ uiSchema, jsonSchema });
    return [
      this.uiWidgetTypeMapper({ fields, uiSchema })
    ];
  }

  /**
   * Private function used by getJSONSchemaForm to convert the configs fetched
   * from Adapters into the format used by Formly for field config
   *
   * @param uiSchema UI config specific to this form
   * @param jsonSchema JSON representation of data model
   */
  private jsonSchemaToFieldConfig({ uiSchema, jsonSchema }) {
    const formConfig = this.toFieldConfig(jsonSchema);
    const fields = this.uiMapper(formConfig, jsonSchema, uiSchema);
    return { fields, uiSchema };
  }

  /**
   * Private function used by getJSONSchemaForm to map the widget types
   * for fields with custom widgets defined in UI Schema
   *
   * TODO: Refactor to ensure this is a pure function
   *
   * @param fields Formly Field Config
   * @param uiSchema UI config specific to this form
   */
  private uiWidgetTypeMapper({ fields, uiSchema }) {
    // Utility function to find the array index of field from a fieldGroup based on key
    const getFieldIndexFromGroup = (obj, _key) => {
      const fieldGroup = get(obj, 'fieldGroup', []);
      const checkKey = ({ key }) => key === _key;
      return findIndex(fieldGroup, checkKey);
    };

    return Object.keys(uiSchema).reduce((_fields, uiKey) => {
      const fieldIndex = getFieldIndexFromGroup(_fields, uiKey);
      if (fieldIndex !== -1) {
        // Map simple top level widget types
        if (has(uiSchema, `${uiKey}.ui:widget`)) {
          const newWidgetType = get(uiSchema, `${uiKey}.ui:widget`, '');
          set(_fields, `fieldGroup[${fieldIndex}].type`, newWidgetType);
        }
        // Recursively map arrays
        if (has(uiSchema, `${uiKey}.items`)) {
          const oldArray = get(_fields, `fieldGroup[${fieldIndex}].fieldArray`, {});
          const subSchema = get(uiSchema, `${uiKey}.items`);
          const newArray = this.uiWidgetTypeMapper({ fields: oldArray, uiSchema: subSchema});
          set(_fields, `fieldGroup[${fieldIndex}]`,
            { ...get(_fields, `fieldGroup[${fieldIndex}]`), fieldArray: newArray });
        }
        // Nested objects
        if (uiKey !== 'items' && isObject(get(uiSchema, uiKey))) {
          const oldObj = get(_fields, `fieldGroup[${fieldIndex}]`, {});
          const subSchema = get(uiSchema, `${uiKey}`);
          const newObj = this.uiWidgetTypeMapper({ fields: oldObj, uiSchema: subSchema });
          set(_fields, `fieldGroup[${fieldIndex}]`, { ...oldObj, ...newObj });
        }
      }
      return _fields;
    }, fields);
  }

  getSchema(groupId: string, formId: string): Observable<any> {
    // TODO: This is not very robust
    const url = has(FORM_APIS, `${groupId}.${formId}.uiSchema`)
      ? FORM_APIS[groupId][formId].jsonSchema
      : ADAPTER_PREFIX + this.adapters.getAdapterSync(groupId)['adapter']['forms'][formId].jsonSchema;
    return this.http.get<FormlyFieldConfig[]>(url);
  }

  toFieldConfig(schema) {
    return this.formlyJsonschema.toFieldConfig(schema);
  }

  uiMapper(formlyConfig, jsonSchema, uiSchema) {
  //  let test =  this.config;
    let val;
    const SELECT_CONFIG: Array<any> = [];
    // console.log(jsonSchema);
    let i = 0;
    try {
      if (Object.keys(uiSchema).length) {
        Object.keys(jsonSchema.properties).forEach(function (key) {
          Object.keys(uiSchema).forEach(function (uiKey) {
            if (uiKey === key) {
              //  jsonSchema.properties.bandArtist.type = uiSchema.bandArtist['ui:widget'];
              // TODO: maybe use Switch here

              formlyConfig['fieldGroup'][i]['templateOptions']['disabled'] = uiSchema[key]['ui:disabled'];
              formlyConfig['fieldGroup'][i]['templateOptions']['placeholder'] = uiSchema[key]['ui:placeholder'];
              formlyConfig['fieldGroup'][i]['templateOptions']['required'] = get(uiSchema, `${key}.ui:required`, false);
              formlyConfig['fieldGroup'][i]['templateOptions']['errMessage'] =  get(uiSchema, `${key}.ui:errMessage`, 'Error!!!');
              formlyConfig['fieldGroup'][i]['templateOptions']['addTag'] =  get(uiSchema, `${key}.ui:addTag`, false);

              formlyConfig['fieldGroup'][i]['templateOptions']['autosize'] =  get(uiSchema, `${key}.ui:autosize`, false);
              formlyConfig['fieldGroup'][i]['templateOptions']['rows'] =  get(uiSchema, `${key}.ui:rows`, 20);
              formlyConfig['fieldGroup'][i]['templateOptions']['cols'] =  get(uiSchema, `${key}.ui:cols`, 30);

              // formlyConfig.fieldGroup[i].templateOptions.options = this.getHttpRefData(uiSchema[key]['ui:refdataId']);

              if (uiSchema[key]['ui:widget'] === 'typeahead' || uiSchema[key]['ui:widget'] === 'kselect') {
                formlyConfig['fieldGroup'][i]['templateOptions']['labelProp'] = get(uiSchema, `${key}.ui:labelProp`, 'label');
                formlyConfig['fieldGroup'][i]['templateOptions']['valueProp'] = get(uiSchema, `${key}.ui:valueProp`, 'value');
                formlyConfig['fieldGroup'][i]['templateOptions']['isMultiSelect'] = get(uiSchema, `${key}.ui:isMultiSelect`, false);

              // const vm =  formlyConfig['fieldGroup'][i]['validators'];

                const ref = get(uiSchema, `${key}.ui:ref`, '');
                const refType = get(uiSchema, `${key}.ui:refType`, 'json');

                SELECT_CONFIG.push(
                  { 'key': i, ref, refType },
                );
              }
            }
          });
          i++;
        });
      }
      if (SELECT_CONFIG.length) {

        SELECT_CONFIG.forEach((item, index) => {
          const refType = SELECT_CONFIG[index].refType;
          if (refType === 'fetch' && SELECT_CONFIG[index].ref) {
            this.http.get(SELECT_CONFIG[index].ref).subscribe(newValue => {
              formlyConfig.fieldGroup[item.key].templateOptions.options = newValue;
            });
          } else {
            this.http.get(REFDATA_APIS[SELECT_CONFIG[index].ref][SELECT_CONFIG[index].refType])
              .subscribe(newValue => {
                formlyConfig.fieldGroup[item.key].templateOptions.options = newValue;
              });
          }
        });

      }

      // console.log(SELECT_CONFIG);
      return formlyConfig;
    } catch (e) {

    }

  }

  /**
   * This adds support for UI Schema ui:widget specifications by updating the field
   * type in jsonSchema to match the type provided in ui:widget
   *
   * Warning - not a pure function
   * TODO: refactor to maintain referential transparency
   *
   * @param uiSchema ui schema with widget config
   * @param jsonSchema schema to be updated
   */
  uiTypeMapper(uiSchema: any, jsonSchema: any) {
    Object.keys(uiSchema).forEach((uiKey) => {
      Object.keys(jsonSchema.properties).forEach((schemaKey) => {
        if ((uiKey === schemaKey) && uiSchema[uiKey]['ui:widget']) {
          jsonSchema.properties[schemaKey].type = uiSchema[uiKey]['ui:widget'];
        }
        // Calls to widget type mapping when using $ref within schema fail here
        // because the reference has not been de-referenced by the time this mapper is called
        // TODO: FIX THIS!
        // if ((uiKey === schemaKey) && get(jsonSchema, `properties.${schemaKey}.type`, '') === 'array') {
        //   this.uiTypeMapper(uiSchema[uiKey].items, jsonSchema['properties'][schemaKey].items);
        // }
      });
    });
  }

  jsonMapper(jsonSchema, uiSchema) {
    let i = 0;
    try {

      Object.keys(uiSchema).forEach(function (key) {
        Object.keys(jsonSchema.properties).forEach(function (uiKey) {
          if (uiKey === key) {
            jsonSchema.properties[i].type = uiSchema.bandArtist['ui:widget'];

          }
        });
        i++;
      });
      return jsonSchema;
    } catch (e) {

    }

  }

  errorHandler(error: HttpErrorResponse) { // added HttpInterceptor so maybe dont need this
    if (error.error instanceof ErrorEvent) {
      console.error('An error occurred:', error.error.message);
    } else {
      console.error(
        `Backend http returned code ${error.status}, ` +
        `body was: ${error.error}`);
    }
    return throwError(
      'Something naughty happened; please try again later.');

  }

  // public getFormById(id: string, disabled = false, data?: object) {
  //   const ob = FORMS_VALUES(disabled, data)[id];
  //   console.log(ob)
  //   return ob;
  // }

  // public getJSONFormById(id: string, disabled = false, data: any = {}) {
  //   const frm = this.generateCleanJsonConfiguration(FORMS_VALUES(disabled, data)[id]);
  //   return  frm;
  // }

  // private generateCleanJsonConfiguration(clone: object[]) {  // use this to create JSON config ??? maybe??
  //   return JSON.parse(JSON.stringify(clone));
  // }

  getRefData() {
    return this.http.get('assets/fake-data/test-ref-data.json');
  }

  //   getHttpRefData(id: string) {
  //   this.getRefData()
  //   .subscribe(newValue => {
  //  formlyConfig.fieldGroup[i].templateOptions.options = this.getHttpRefData(uiSchema[key]['ui:refdataId']);
  //   });
  // }


  // getYoutubeFields() {

  //   const mappedFields = [
  //     { 'field': 'FULLNAME', 'enabled': false },
  //     { 'field': 'EMAIL', 'enabled': false },
  //   ];

  //   const myFields = [
  //     // FULLNAME(false, data['fullname']),
  //     // EMAIL(false, data['email']),
  //   ];

  //   mappedFields.forEach(v => {
  //     const fname = v.field;


  //     //  myFields.push(

  //         console.log(v[fname](false, {
  //           'id': 'YOUTUBE',
  //           'fullname': 'Bernie Winters',
  //           'email': 'bernie@heaven.com'
  //       }));

  //       //  [fname](false, data['fullname'])


  //    //   );


  //   });

  // }



}
