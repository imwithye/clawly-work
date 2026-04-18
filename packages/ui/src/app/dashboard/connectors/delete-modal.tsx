"use client";

import { Button } from "@/components/button";
import { Modal } from "@/components/modal";

export function DeleteModal({
  open,
  name,
  onClose,
  onConfirm,
}: {
  open: boolean;
  name: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Header>Delete Connector</Modal.Header>
      <Modal.Body>
        <p className="text-sm text-foreground">
          Are you sure you want to delete{" "}
          <span className="text-danger font-medium">{name}</span>? This action
          cannot be undone.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>
          [cancel]
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          [delete]
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
