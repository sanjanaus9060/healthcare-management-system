import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export default function ConfirmButton({ label, title, description, confirmLabel = "Confirm", onConfirm, testId, variant = "outline", size = "sm", className = "" }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button data-testid={testId} variant={variant} size={size} className={className}>{label}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid={`${testId}-cancel`}>Keep it</AlertDialogCancel>
          <AlertDialogAction data-testid={`${testId}-confirm`} onClick={onConfirm} className="bg-red-600 hover:bg-red-700">{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
