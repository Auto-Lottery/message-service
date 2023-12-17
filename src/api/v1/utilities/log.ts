/* eslint-disable @typescript-eslint/no-explicit-any */
export const debugLog = (...args: any[]) => {
  if (process.env.NODE_ENV !== "production") {
    console.log("[DEBUG]: ", ...args);
  }
};

export const errorLog = (...args: any[]) => {
  console.error("[ERROR]: ", ...args);
};

export const infoLog = (...args: any[]) => {
  console.log("[INFO]: ", ...args);
};
