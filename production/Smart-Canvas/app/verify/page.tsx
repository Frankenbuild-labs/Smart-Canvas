"use client";
import VerifyClient from "./VerifyClient";
import { Suspense } from "react";

export default function VerifyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyClient />
    </Suspense>
  );
} 