import {Properties} from "csstype";

export const getGroupStyle = (): Properties => {
  return {display: "flex", marginRight: "-5px", flexWrap: "wrap"};
};

export const getInputStyle = (others?: Properties): Properties => {
  return {flex: "1 1 0", width: "0", paddingRight: "5px", boxSizing: "border-box", ...others};
};
