import { fireEvent, render, screen } from "@testing-library/react";
import { ConfirmDialog, Pagination, RouterState, StatusBadge } from "./ui";

describe("ui", () => {
  it("never shows router state by color alone", () => {
    render(<RouterState online={false} error="timeout" />);
    expect(screen.getByText("Router offline")).toBeInTheDocument();
  });

  it("labels voucher status", () => {
    render(<StatusBadge status="online" label="Online" />);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("paginates", () => {
    const onPage = vi.fn();
    render(<Pagination page={1} pageSize={50} total={120} onPage={onPage} />);
    expect(screen.getByText("1–50 of 120")).toBeInTheDocument();
    expect(screen.getByText("Previous")).toBeDisabled();
    fireEvent.click(screen.getByText("Next"));
    expect(onPage).toHaveBeenCalledWith(2);
  });

  it("confirm dialog calls back", () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog open title="Disable voucher?" message="Sure?" confirmLabel="Disable" onConfirm={onConfirm} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Disable" }));
    expect(onConfirm).toHaveBeenCalled();
  });
});
