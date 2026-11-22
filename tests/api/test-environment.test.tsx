import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";

// Infrastructure fixture only; application components stay with their owners.
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count {count}</button>;
}

it("executes React TSX, DOM interaction, and DOM matchers alongside Node tests", async () => {
  render(<Counter />);
  await userEvent.setup().click(screen.getByRole("button"));
  expect(screen.getByRole("button")).toHaveTextContent("Count 1");
});
