import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertDialog, Button, Flex } from "@radix-ui/themes";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) throw new Error("useConfirm must be used within a ConfirmProvider");
  return fn;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((input: ConfirmOptions | string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOptions(typeof input === "string" ? { title: input } : input);
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setOptions(null);
    resolve?.(value);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root
        open={options !== null}
        onOpenChange={(open) => { if (!open) settle(false); }}
      >
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>{options?.title}</AlertDialog.Title>
          {options?.description && (
            <AlertDialog.Description size="2">
              {options.description}
            </AlertDialog.Description>
          )}
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">
                {options?.cancelLabel ?? "Cancel"}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color="red" onClick={() => settle(true)}>
                {options?.confirmLabel ?? "Confirm"}
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  );
}
