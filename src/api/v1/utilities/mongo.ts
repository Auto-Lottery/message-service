import mongoose from "mongoose";

/* eslint-disable no-unused-vars */

export enum FilterValueType {
  STRING = "string",
  ID = "objectId",
  NUMBER = "number",
  BOOLEAN = "boolean"
}

export type FilterOperatorType = Record<
  string,
  {
    name: string;
    op: string;
  }
>;

export type Condition = {
  operator: string;
  value?: string | number;
  valueArray?: Array<string | number>;
  valueType: FilterValueType;
  field: string;
};

export type Filter = {
  conditions?: Array<Condition>;
  sort?: {
    field: string;
    order: string;
  };
  pagination?: {
    page: number;
    pageSize: number;
  };
};

const filterOperatorData: FilterOperatorType = {
  IN: {
    name: "in",
    op: "$in"
  },
  NIN: {
    name: "not in",
    op: "$nin"
  },
  NE: {
    name: "!=",
    op: "$ne"
  },
  EQ: {
    name: "=",
    op: "$eq"
  },
  GT: {
    name: ">",
    op: "$gt"
  },
  GTE: {
    name: ">=",
    op: "$gte"
  },
  LT: {
    name: "<",
    op: "$lt"
  },
  LTE: {
    name: "<=",
    op: "$lte"
  },
  LIKE: {
    name: "like",
    op: "like"
  }
};

export const generateQuery = (conditions: Condition[]) => {
  let match = {};

  if (conditions.length > 0) {
    conditions.forEach((con) => {
      let operator = con.operator;

      Object.keys(filterOperatorData).forEach((key) => {
        if (filterOperatorData[key].name === con.operator) {
          operator = filterOperatorData[key].op;
        }
      });

      let value:
        | string
        | number
        | boolean
        | undefined
        | Array<string | number | mongoose.Types.ObjectId>
        | mongoose.Types.ObjectId = con.value;
      if (
        con.valueArray &&
        con.valueArray.length > 0 &&
        ["in", "not in"].includes(con.operator)
      ) {
        value = con.valueArray;
        if (con.valueType === "number") {
          value = con.valueArray.map((val) => Number(val));
        } else if (con.valueType === "objectId") {
          value = con.valueArray.map(
            (val) => new mongoose.Types.ObjectId(val.toString())
          );
        }
      } else {
        switch (con.valueType) {
          case "number":
            value = Number(con.value);
            break;
          case "boolean":
            value = Boolean(con.value);
            break;
          case "objectId":
            value = new mongoose.Types.ObjectId(con.value);
            break;
          default:
            break;
        }
      }
      const field = con.field;
      if (operator === "like") {
        match = {
          ...match,
          [field]: new RegExp(`^${value as string}`)
        };
      } else {
        match = {
          ...match,
          [field]: { [operator]: value }
        };
      }
    });
  }

  return match;
};
