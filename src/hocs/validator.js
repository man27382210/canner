// @flow

import Ajv from "ajv";
import React, {PureComponent} from "react";
import {fromJS, Map} from "immutable";
import type RefId from 'canner-ref-id';
import {createEmptyData} from 'canner-helpers';

const defaultErrorHandle = () => {
  return "預設資料錯誤";
};
const ErrorText = ({text}) => {
  return <p style={{color: "red"}}>{text}</p>;
};

type Props = {
  value: any,
  type: string,
  onChange: Function,
  refId: RefId,
  items: {[string]: any},
  ui: string,
  uiParams: {[string]: any},
  onValid: Function,
  onInvalid: Function,
  validateSchema: any,
  defaultData: any,
  errorHandle: Function
};
type State = {
  valid: boolean,
  safeToRender: boolean
};

export default (Plugin: any) => {
  // eslint-disable-line no-unused-vars
  const ajv = new Ajv();
  class PluginWithValidator extends PureComponent<Props, State> {
    constructor(props: Props) {
      super(props);
      this.state = {
        valid: true,
        safeToRender: false
      };
    }

    UNSAFE_componentWillMount() {
      const {value, onChange, refId, type, defaultData} = this.props;
      if (this.validate(value)) {
        this.setState({
          safeToRender: true
        });
      } else {
        onChange(
          refId.toString(),
          "update",
          fromJS(defaultData) || this.getDefaultData(type)
        );
      }
    }

    UNSAFE_componentWillReceiveProps(nextProps: Props) {
      const {onChange, refId, defaultData, type} = this.props;
      if (this.validate(nextProps.value)) {
        this.setState({
          safeToRender: true
        });
      } else {
        onChange(
          refId.toString(),
          "update",
          fromJS(defaultData) || this.getDefaultData(type)
        );
      }
    }

    getDefaultData(type: string) {
      const {items, ui} = this.props;
      switch (type) {
        case 'array':
        case 'string':
        case 'boolean':
        case 'number':
          return createEmptyData({type, ui});
        case 'object':
          if (ui === 'map') {
            return new Map();
          }
          if (items) {
            return createEmptyData(items);
          }
          return undefined;
        default:
          return undefined;
      }
    }

    onChange = (id: string, type: string, value: any) => {
      // id !== this.props.id: 如果傳上來更動資料的id !== this.props.id，表示現在的這個Plugin不是更動資料的那個Plugin，所以在這層不需要做驗證
      if (
        type === "swap" ||
        type === "ref" ||
        type === "delete" ||
        id !== this.props.refId.toString()
      ) {
        this.props.onChange(id, type, value);
      } else if (this.validate(value)) {
        this.props.onChange(id, type, value);
      }
    }

    validate = (data: any) => {
      const {onValid, onInvalid, refId, validateSchema} = this.props;
      const jsData = data && data.toJS ? data.toJS() : data;
      const valid = ajv.validate(validateSchema, jsData);
      if (valid && onValid) {
        onValid(refId.toString() || Plugin.name);
      } else if (onInvalid) {
        onInvalid(refId.toString() || Plugin.name);
      }
      this.setState({valid});
      return valid;
    }

    errorsText() {
      const {errorHandle} = this.props;
      return errorHandle ?
        errorHandle(ajv.errors || []) :
        defaultErrorHandle();
    }

    render() {
      const {valid, safeToRender} = this.state;
      return (
        <div>
          {valid ? null : <ErrorText text={this.errorsText()} />}
          {safeToRender ? (
            <Plugin {...this.props} onChange={this.onChange} />
          ) : null}
        </div>
      );
    }
  }
  return PluginWithValidator;
};