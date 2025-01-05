"use client";

import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { type Concept } from "@/types/learning";
import { RenameDialog } from "./rename-dialog";
import { Button } from "@/components/ui/button";
import { MoreVertical, BookOpen, Clock, Trash2, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { useState } from "react";

interface SessionCardProps {
  session: {
    id: string;
    title: string;
    userId: string;
    progress: number;
    concepts: Concept[];
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
  isActive?: boolean;
}

export function SessionCard({ session, isActive }: SessionCardProps) {
  const router = useRouter();
  const totalConcepts = (session.concepts as Concept[]).length;
  const progress = session.progress || 0;
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      router.refresh();
    } catch (error) {
      console.error('Error deleting session:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "transition-all duration-300 hover:shadow-lg relative border-2",
          isActive 
            ? "border-primary bg-primary/5 shadow-primary/20" 
            : "border-transparent hover:border-primary/20"
        )}
      >
        <div className="absolute right-2 top-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="hover:bg-primary/10 transition-colors duration-200"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32 bg-white p-0 animate-in fade-in-0 zoom-in-95 duration-200">
              <DropdownMenuItem asChild className="p-0 focus:bg-accent">
                <RenameDialog 
                  sessionId={session.id} 
                  currentTitle={session.title}
                  trigger={
                    <Button 
                      variant="ghost" 
                      className="w-full flex items-center justify-between rounded-none bg-white hover:bg-accent/50 h-8 px-2 transition-all duration-200 group"
                    >
                      <span className="transition-transform duration-200 group-hover:scale-105">Rename</span>
                      <Pencil className="h-4 w-4 ml-2 transition-transform duration-200 group-hover:scale-110" />
                    </Button>
                  }
                />
              </DropdownMenuItem>
              <div className="bg-white px-2">
                <div className="h-px bg-border" />
              </div>
              <DropdownMenuItem asChild className="p-0 focus:bg-accent">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full flex items-center justify-between rounded-none bg-white text-destructive hover:bg-destructive/10 h-8 px-2 transition-all duration-200 group"
                      disabled={isDeleting}
                    >
                      <span className="transition-transform duration-200 group-hover:scale-105">Delete</span>
                      <Trash2 className="h-4 w-4 ml-2 transition-transform duration-200 group-hover:scale-110" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        learning session and all its associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-white hover:bg-muted/50">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        variant="destructive"
                        disabled={isDeleting}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div 
          onClick={() => router.push(`/dashboard/learning?session=${session.id}`)}
          className="cursor-pointer"
        >
          <CardHeader className="pb-2">
            <div className="flex items-start space-x-2">
              <BookOpen className="h-5 w-5 text-primary mt-1" />
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold leading-none">
                  {session.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {totalConcepts} concepts
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-primary">Progress</span>
                  <span className="font-semibold">{Math.round(progress)}%</span>
                </div>
                <Progress 
                  value={progress} 
                  className="h-2 transition-all duration-500"
                />
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="mr-1 h-3 w-3" />
                Last accessed {formatDistanceToNow(new Date(session.updatedAt))} ago
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
} 