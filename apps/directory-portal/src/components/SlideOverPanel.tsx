import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import "./SlideOverPanel.css";

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const SlideOverPanel: React.FC<SlideOverPanelProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal container={document.querySelector("[data-is-root-theme]") ?? undefined}>
        <Dialog.Overlay className="slide-over-overlay" />
        <Dialog.Content
          className="slide-over-content"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="slide-over-header">
            <div className="slide-over-header-left">
              <Dialog.Title asChild>
                <h2>{title}</h2>
              </Dialog.Title>
              {subtitle && (
                <Dialog.Description asChild>
                  <p className="slide-over-subtitle">{subtitle}</p>
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button className="slide-over-close" aria-label="Close">
                <Cross2Icon width={18} height={18} />
              </button>
            </Dialog.Close>
          </div>
          <div className="slide-over-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default SlideOverPanel;
