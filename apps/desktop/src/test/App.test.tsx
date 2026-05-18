import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import App from "../App";

afterEach(cleanup);

describe("App", () => {
  it("renders the Lexora wordmark", () => {
    render(<App />);
    expect(screen.getByText("Lexora")).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<App />);
    expect(
      screen.getByText("Premium vocabulary learning platform"),
    ).toBeInTheDocument();
  });
});
