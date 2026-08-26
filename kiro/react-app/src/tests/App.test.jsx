import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../App";

describe("App Component", () => {
  it("renders without crashing", () => {
    render(<App />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("displays the main heading", () => {
    render(<App />);
    expect(screen.getByText(/Save Up To 70% On/i)).toBeInTheDocument();
  });

  it("shows the features section", () => {
    render(<App />);
    expect(screen.getByText(/All in One Solution/i)).toBeInTheDocument();
  });

  it("displays destinations section", () => {
    render(<App />);
    expect(screen.getByText(/Popular Destinations/i)).toBeInTheDocument();
  });

  it("shows accommodations section", () => {
    render(<App />);
    expect(screen.getByText(/Featured Accommodations/i)).toBeInTheDocument();
  });

  it("displays booking section", () => {
    render(<App />);
    expect(screen.getByText(/Book Your Perfect Trip/i)).toBeInTheDocument();
  });
});
