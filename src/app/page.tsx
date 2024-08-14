'use client';

import { useState } from "react";
import { Button } from "../components/ui/button";
import { IGeopoliticalAnalysis, ITableRow, TFormValues } from "~/lib/types";
import { geopoliticalAnalysisToTableRow, generateCountryPairId } from "~/lib/utils";
import { insertGeoPulse } from "~/lib/api";
import { createClient } from "~/lib/supabase/client";
import CountrySelectComponent from "~/components/CountrySelectComponent";
import { useForm } from "react-hook-form";
import { Form } from "~/components/ui/form";
import Spinner from "~/components/Spinner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod"
import Header from "~/components/Header";
import { useToast } from "~/components/ui/use-toast";
import OutputArea from "~/components/OutputArea";
import TsxBadge from "~/components/TsxBadge";

const FormSchema = z.object({
  country1: z.string().min(1),
  country2: z.string().min(1),
});

export default function HomePage() {
  const toast = useToast();
  const [output, setOutput] = useState<ITableRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { country1: "", country2: "" }
  });

  const handleSubmit = async (values: z.infer<typeof FormSchema>) => {
    const supabase = createClient();

    if (!values.country1 || !values.country2) {
      toast({
        title: "Please select both countries.",
        description: "Please select both countries.",
        status: "error",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);
    setOutput(null);

    const countries = [values.country1, values.country2].sort();
    const generatedId = generateCountryPairId(countries[0] ?? '', countries[1] ?? '');

    try {
      const { data: existingData, error } = await supabase
        .from('geo_pulses')
        .select('*')
        .eq('id', generatedId)
        .maybeSingle();

      if (error) {
        throw new Error(error?.message ?? "Failed to fetch data from the database");
      }

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      if (existingData && new Date(existingData.last_updated) > oneWeekAgo) {
        setOutput(existingData);
      } else {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            country1: countries[0],
            country2: countries[1],
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate data");
        }

        const generatedData: IGeopoliticalAnalysis = await response.json();
        const geoPulseTableFormat = geopoliticalAnalysisToTableRow(generatedData, generatedId, countries);

        setOutput(geoPulseTableFormat);
        await insertGeoPulse(geoPulseTableFormat, generatedId, Object.keys(existingData ?? {}).length > 0 ? true : false);
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error occurred while handling measurement.",
        description: error?.message ?? "---",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex h-screen flex-col items-center justify-start p-6 gap-8 transition">
      <Header />
      <div className="mt-4 p-4 max-w-2xl h-fit flex flex-col border-[1px] border-solid border-gray-100 items-center justify-start rounded-md shadow-md bg-gray-50 hover:bg-gray-100 transition">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            <CountrySelectComponent form={form} />
            <div className="flex flex-col md:flex-row gap-2 items-center justify-center">
              <Button
                size='sm'
                type="submit"
                className="w-[120px] bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Spinner />
                ) : (
                  "Measure"
                )}
              </Button>
              <Button
                size='sm'
                type="reset"
                className="w-[120px] bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
                onClick={() => {
                  form.reset();
                  setOutput(null);
                }}
              >
                Reset
              </Button>
            </div>
          </form>
        </Form>
      </div>
      <OutputArea output={output} />
      <TsxBadge />
    </main>
  );
}
