"use client";

import React, { useState } from "react";
import { 
  Button, 
  Input, 
  Select, 
  SelectItem, 
  Checkbox, 
  Badge, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Table, 
  Header, 
  Body, 
  Row, 
  HeaderCell, 
  Cell, 
  Alert, 
  Separator, 
  toast 
} from "@/components/ui";
import { 
  Info, CheckCircle2, AlertTriangle, AlertCircle, Sparkles
} from "lucide-react";

export function ComponentLibrary() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [inputText, setInputText] = useState("");
  const [checkboxVal, setCheckboxVal] = useState(false);
  const [selectVal, setSelectVal] = useState("");

  const triggerToast = (variant: "default" | "success" | "warning" | "destructive") => {
    toast({
      variant,
      title: `${variant.toUpperCase()} Notification`,
      description: `This is a live ${variant} toast event triggered interactively.`,
      duration: 3000
    });
  };

  const categories = [
    { id: "all", label: "All Components" },
    { id: "forms", label: "Buttons & Form Inputs" },
    { id: "data", label: "Cards, Badges & Tables" },
    { id: "feedback", label: "Alerts & Toasts" }
  ];

  return (
    <div className="space-y-8 p-6 lg:p-10 max-w-6xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col gap-2 border-b border-zinc-800 pb-6">
        <div className="inline-flex items-center gap-2 text-indigo-400 font-bold text-sm tracking-widest uppercase">
          <Sparkles size={16} /> Design System Core
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white">ResearchReel Design System</h1>
        <p className="text-zinc-400 text-sm max-w-2xl leading-relaxed">
          Explore and interact with the UI/UX components built to deliver a premium, glassmorphic experience.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <aside className="lg:w-64 shrink-0 flex flex-col gap-2">
          <div className="px-3 text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Categories</div>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{cat.label}</span>
            </button>
          ))}
        </aside>

        {/* Content area */}
        <div className="flex-1 space-y-12">
          {/* Buttons & Form Inputs */}
          {(selectedCategory === "all" || selectedCategory === "forms") && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold text-white border-b border-zinc-850 pb-2">Buttons & Inputs</h2>
              
              <Card>
                <CardHeader>
                  <CardTitle>Button Variants</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button variant="default">Default Button</Button>
                  <Button variant="gradient">Gradient Action</Button>
                  <Button variant="secondary">Secondary Button</Button>
                  <Button variant="outline">Outline Border</Button>
                  <Button variant="destructive">Destructive action</Button>
                  <Button variant="ghost">Ghost Button</Button>
                  <Button variant="link">Link Button</Button>
                </CardContent>
              </Card>

              <Separator />

              <Card>
                <CardHeader>
                  <CardTitle>Form Elements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Text Input</label>
                      <Input 
                        placeholder="Search publications..." 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Select Options</label>
                      <Select value={selectVal} onValueChange={setSelectVal}>
                        <SelectItem value="physics">Quantum Physics</SelectItem>
                        <SelectItem value="bio">Biology</SelectItem>
                        <SelectItem value="cs">Computer Science</SelectItem>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Checkbox checked={checkboxVal} onChange={setCheckboxVal} id="demo-check" />
                    <label htmlFor="demo-check" className="text-sm text-zinc-300 font-semibold cursor-pointer select-none">
                      Enable advanced vector filtering
                    </label>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Cards, Badges & Tables */}
          {(selectedCategory === "all" || selectedCategory === "data") && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold text-white border-b border-zinc-850 pb-2">Cards, Badges & Tables</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Interactive Glass Card</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Cards combine glass panel styling with backdrop blurs to stand out clearly on dark layouts.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="default">Primary Badge</Badge>
                      <Badge variant="success">Verified</Badge>
                      <Badge variant="warning">Under Review</Badge>
                      <Badge variant="destructive">Declined</Badge>
                      <Badge variant="secondary">Draft</Badge>
                      <Badge variant="outline">Peer Review</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Data Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-center text-sm py-1.5 border-b border-zinc-800">
                      <span className="text-zinc-400">Total Publications</span>
                      <span className="font-bold text-white">1,245</span>
                    </div>
                    <div className="flex justify-between items-center text-sm py-1.5 border-b border-zinc-800">
                      <span className="text-zinc-400">Video Reels Processed</span>
                      <span className="font-bold text-white">412</span>
                    </div>
                    <div className="flex justify-between items-center text-sm py-1.5">
                      <span className="text-zinc-400">Success Rate</span>
                      <span className="font-bold text-emerald-400">98.4%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Sample Data Table</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <Header>
                      <Row>
                        <HeaderCell>Researcher ID</HeaderCell>
                        <HeaderCell>Topic area</HeaderCell>
                        <HeaderCell>Verified date</HeaderCell>
                        <HeaderCell>Verification</HeaderCell>
                      </Row>
                    </Header>
                    <Body>
                      <Row>
                        <Cell className="font-bold">@albert_einstein</Cell>
                        <Cell>General Relativity</Cell>
                        <Cell>June 14, 2026</Cell>
                        <Cell><Badge variant="success">Active</Badge></Cell>
                      </Row>
                      <Row>
                        <Cell className="font-bold">@marie_curie</Cell>
                        <Cell>Radioactivity</Cell>
                        <Cell>July 02, 2026</Cell>
                        <Cell><Badge variant="success">Active</Badge></Cell>
                      </Row>
                      <Row>
                        <Cell className="font-bold">@newton_isaac</Cell>
                        <Cell>Classical Mechanics</Cell>
                        <Cell>Pending</Cell>
                        <Cell><Badge variant="warning">Under Review</Badge></Cell>
                      </Row>
                    </Body>
                  </Table>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Alerts & Toasts */}
          {(selectedCategory === "all" || selectedCategory === "feedback") && (
            <section className="space-y-6">
              <h2 className="text-xl font-bold text-white border-b border-zinc-850 pb-2">Feedback Elements</h2>

              <Card>
                <CardHeader>
                  <CardTitle>Banners & Alerts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert variant="info" title="System Update">
                    ResearchReel version 2.0 has been deployed with enhanced video encoding pipelines.
                  </Alert>

                  <Alert variant="success" title="Generation Complete">
                    Your research summary video was successfully rendered. Check your profile.
                  </Alert>

                  <Alert variant="warning" title="Credit Alert">
                    You have 2 generation tokens left for today. Recharge to continue.
                  </Alert>

                  <Alert variant="destructive" title="Connection Timeout">
                    Failed to reach Python RAG server. Verify backend is running on port 8000.
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Floating Toast Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-zinc-400">
                    Click the buttons below to trigger temporary sliding notifications.
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    <Button variant="outline" className="gap-2" onClick={() => triggerToast("default")}>
                      <Info size={16} /> Trigger Info
                    </Button>
                    <Button variant="outline" className="gap-2 text-emerald-400 hover:text-emerald-300" onClick={() => triggerToast("success")}>
                      <CheckCircle2 size={16} /> Trigger Success
                    </Button>
                    <Button variant="outline" className="gap-2 text-amber-400 hover:text-amber-300" onClick={() => triggerToast("warning")}>
                      <AlertTriangle size={16} /> Trigger Warning
                    </Button>
                    <Button variant="outline" className="gap-2 text-red-400 hover:text-red-300" onClick={() => triggerToast("destructive")}>
                      <AlertCircle size={16} /> Trigger Error
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
