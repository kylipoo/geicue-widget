import React from "react";
import ReactDOM from "react-dom/client";
import Widget from "./Widget";
import "./logger/instrument";

window.renderMyWidget = function (containerId, props) {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container with id ${containerId} not found`);
  }
  const root = ReactDOM.createRoot(container);
  root.render(<Widget {...props} />);
};
