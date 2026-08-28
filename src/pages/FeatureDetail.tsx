import React from "react";
import { BlogPost } from "../types";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowLeft, CalendarDays, FileText, ExternalLink, MessageSquare, CornerDownRight } from "lucide-react";
import { useLogo } from "../hooks/useLogo";


const fallbackImage = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&q=80&w=1400";

const formatDate = (value: string) => {
  if (!value) return "Latest";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

type ContentPart =
  | { type: "text"; value: string }
  | { type: "image"; url: string; caption: string };

const parseContent = (content: string): ContentPart[] => {
  const parts: ContentPart[] = [];
  const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = imagePattern.exec(content)) !== null) {
    const text = content.slice(lastIndex, match.index);
    if (text.trim()) parts.push({ type: "text", value: text });
    parts.push({ type: "image", caption: match[1] || "Feature image", url: match[2] });
    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.slice(lastIndex);
  if (remainingText.trim()) parts.push({ type: "text", value: remainingText });

  return parts;
};

const renderParagraphWithLinks = (text: string) => {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = text.split(linkRegex);
  if (parts.length === 1) {
    return text;
  }

  const elements: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i += 3) {
    if (parts[i]) {
      elements.push(parts[i]);
    }
    if (i + 1 < parts.length) {
      const linkText = parts[i + 1];
      const linkUrlFull = parts[i + 2];
      
      let linkUrl = linkUrlFull;
      let target = "_blank";
      if (linkUrlFull.includes("|")) {
        const urlParts = linkUrlFull.split("|");
        linkUrl = urlParts[0];
        target = urlParts[1];
      }

      elements.push(
        <a
          key={`link-${i}`}
          href={linkUrl}
          target={target}
          rel={target === "_blank" ? "noopener noreferrer" : undefined}
          className="text-neon-blue hover:text-neon-purple underline decoration-neon-blue/60 hover:decoration-neon-purple/80 underline-offset-4 decoration-2 font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
        >
          {linkText}
          {target === "_blank" && (
            <ExternalLink className="w-3.5 h-3.5 inline text-neon-blue/70" />
          )}
        </a>
      );
    }
  }
  return elements;
};

export default function FeatureDetail() {
  const { slug } = useParams();
  const { isLightMode } = useLogo();

  const [comments, setComments] = React.useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = React.useState(true);
  const [authorName, setAuthorName] = React.useState("");
  const [authorEmail, setAuthorEmail] = React.useState("");
  const [contentText, setContentText] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitSuccess, setSubmitSuccess] = React.useState("");
  const [submitError, setSubmitError] = React.useState("");

  // Reply state variables
  const [activeReplyId, setActiveReplyId] = React.useState<number | null>(null);
  const [replyName, setReplyName] = React.useState("");
  const [replyEmail, setReplyEmail] = React.useState("");
  const [replyContent, setReplyContent] = React.useState("");
  const [isSubmittingReply, setIsSubmittingReply] = React.useState(false);
  const [replySuccessMessage, setReplySuccessMessage] = React.useState("");
  const [replyErrorMessage, setReplyErrorMessage] = React.useState("");

  const fetchComments = async () => {
    if (!slug) {
      setCommentsLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/public/features/${slug}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load comments", e);
    } finally {
      setCommentsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchComments();
  }, [slug]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !contentText.trim()) {
      setSubmitError("Name and Comment text are required.");
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess("");
    setSubmitError("");

    try {
      const res = await fetch(`/api/public/features/${slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_name: authorName,
          author_email: authorEmail || null,
          content: contentText
        })
      });

      if (res.ok) {
        setSubmitSuccess("Your comment has been submitted and is pending admin approval.");
        setAuthorName("");
        setAuthorEmail("");
        setContentText("");
      } else {
        const data = await res.json().catch(() => ({ error: "Failed to submit comment." }));
        setSubmitError(data.error || "Failed to submit comment.");
      }
    } catch (err) {
      console.error(err);
      setSubmitError("Failed to submit comment. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = async (e: React.FormEvent, parentId: number) => {
    e.preventDefault();
    if (!replyName.trim() || !replyContent.trim()) {
      setReplyErrorMessage("Name and Reply text are required.");
      return;
    }

    setIsSubmittingReply(true);
    setReplySuccessMessage("");
    setReplyErrorMessage("");

    try {
      const res = await fetch(`/api/public/features/${slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_name: replyName,
          author_email: replyEmail || null,
          content: replyContent,
          parent_id: parentId
        })
      });

      if (res.ok) {
        setReplySuccessMessage("Your reply has been submitted and is pending admin approval.");
        setReplyName("");
        setReplyEmail("");
        setReplyContent("");
        setTimeout(() => {
          setActiveReplyId(null);
          setReplySuccessMessage("");
        }, 5000);
      } else {
        const data = await res.json().catch(() => ({ error: "Failed to submit reply." }));
        setReplyErrorMessage(data.error || "Failed to submit reply.");
      }
    } catch (err) {
      console.error(err);
      setReplyErrorMessage("Failed to submit reply. Please check your connection.");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const { data: post, isLoading, isError } = useQuery<BlogPost>({
    queryKey: ["feature", slug],
    queryFn: async () => {
      const res = await fetch(`/api/public/features/${slug}`);
      if (!res.ok) throw new Error("Feature not found");
      return res.json();
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });

  const topLevelComments = comments.filter(c => !c.parent_id);
  const getRepliesFor = (parentId: number) => comments.filter(c => c.parent_id === parentId);

  if (isLoading) {
    return (
      <div className="py-12 px-4 sm:px-6 md:px-8 space-y-8">
        <div className={`h-10 w-36 rounded-xl animate-pulse ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`} />
        <div className={`aspect-[16/7] rounded-3xl animate-pulse ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`} />
        <div className="max-w-3xl mx-auto space-y-4">
          <div className={`h-12 w-full rounded-xl animate-pulse ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`} />
          <div className={`h-4 w-full rounded animate-pulse ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`} />
          <div className={`h-4 w-4/5 rounded animate-pulse ${isLightMode ? 'bg-black/5' : 'bg-white/5'}`} />
        </div>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="py-24 px-4 sm:px-6 md:px-8 text-center space-y-6">
        <FileText className={`w-14 h-14 mx-auto ${isLightMode ? 'text-slate-300' : 'text-white/10'}`} />
        <h1 className={`text-3xl font-display font-black uppercase ${isLightMode ? 'text-slate-900' : 'text-white'}`}>Post not found</h1>
        <Link to="/features" className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
          isLightMode ? 'bg-slate-900 text-white' : 'bg-white text-dark-bg'
        }`}>
          <ArrowLeft className="w-4 h-4" />
          Back to Features
        </Link>
      </div>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-10 md:py-14 px-4 sm:px-6 md:px-8 space-y-10"
    >
      <Link to="/features" className={`inline-flex items-center gap-2 transition-colors text-[10px] font-black uppercase tracking-[0.25em] ${
        isLightMode ? 'text-slate-400 hover:text-slate-900' : 'text-white/40 hover:text-white'
      }`}>
        <ArrowLeft className="w-4 h-4" />
        Back to Features
      </Link>

      <header className="space-y-8">
        <div className="space-y-6 max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neon-purple/15 border border-neon-purple/30 text-neon-purple text-[10px] font-black uppercase tracking-widest">
              <FileText className="w-3.5 h-3.5" />
              Feature
            </span>
            <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm ${
              isLightMode ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-white/10 border-white/10 text-white/90'
            }`}>
              <CalendarDays className="w-3.5 h-3.5 text-neon-blue shrink-0" />
              <span>{formatDate(post.created_at)}</span>
            </span>
            {post.link_url && (
              <a
                href={post.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neon-blue/15 border border-neon-blue/30 text-neon-blue hover:bg-neon-blue/25 transition-colors text-[10px] font-black uppercase tracking-widest"
              >
                <ExternalLink className="w-3.5 h-3.5 text-neon-blue" />
                Visit Link
              </a>
            )}
          </div>

          <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black uppercase tracking-tight leading-[1.08] ${
            isLightMode ? 'text-slate-900' : 'text-white'
          }`}>
            {post.title}
          </h1>

          {post.excerpt && (
            <p className={`text-lg md:text-2xl font-light leading-relaxed border-l-4 border-neon-blue/60 pl-5 ${
              isLightMode ? 'text-slate-600' : 'text-white/70'
            }`}>
              {post.excerpt}
            </p>
          )}
        </div>

        <div className={`relative overflow-hidden rounded-3xl border shadow-2xl transition-all ${
          isLightMode ? 'border-slate-200 bg-slate-100 shadow-slate-200/50' : 'border-white/10 bg-black/60 shadow-black/80'
        }`}>
          <div className="aspect-[16/9] md:aspect-[21/9] max-h-[520px] w-full overflow-hidden relative group">
            <img 
              src={post.image_url || fallbackImage} 
              alt={post.title} 
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out" 
            />
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-2">
        <div className={`glass-panel rounded-2xl p-6 md:p-10 transition-colors ${
          isLightMode ? 'bg-white border-black/10' : 'border-white/5 bg-black/40'
        }`}>
          <div className={`space-y-8 text-base md:text-lg leading-8 font-light ${
            isLightMode ? 'text-slate-700' : 'text-white/75'
          }`}>
            {parseContent(post.content).map((part, index) => {
              if (part.type === "image") {
                return (
                  <figure key={`${part.url}-${index}`} className={`overflow-hidden rounded-2xl border ${
                    isLightMode ? 'border-black/10 bg-black/5' : 'border-white/10 bg-white/5'
                  }`}>
                    <img src={part.url} alt={part.caption} className="w-full max-h-[520px] object-cover" />
                    {part.caption && (
                      <figcaption className={`px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] ${
                        isLightMode ? 'text-slate-400' : 'text-white/35'
                      }`}>
                        {part.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              }

              return part.value
                .split(/\n{2,}/)
                .filter(paragraph => paragraph.trim())
                .map((paragraph, paragraphIndex) => (
                  <p key={`${index}-${paragraphIndex}`} className="whitespace-pre-wrap">
                    {renderParagraphWithLinks(paragraph.trim())}
                  </p>
                ));
            })}
          </div>
        </div>
      </div>

      {/* Comments Board Section */}
      <div className="max-w-3xl mx-auto px-2 mt-8">
        <div className={`glass-panel rounded-2xl p-6 md:p-10 transition-colors space-y-8 ${
          isLightMode ? 'bg-white border-black/10' : 'border-white/5 bg-black/40 animate-fade-in'
        }`}>
          <div className="flex items-center gap-2.5 border-b pb-4 transition-colors border-white/5">
            <MessageSquare className="w-5 h-5 text-neon-purple animate-pulse" />
            <h3 className={`font-display font-black text-xl uppercase tracking-wider ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
              Comments Board <span className={`text-xs font-mono ml-2 font-black ${isLightMode ? 'text-slate-400' : 'text-white/40'}`}>({comments.length})</span>
            </h3>
          </div>

          {/* List of comments */}
          {commentsLoading ? (
            <div className="space-y-4">
              {[1, 2].map(n => (
                <div key={n} className={`h-24 rounded-2xl p-5 animate-pulse border ${isLightMode ? 'bg-white border-black/5' : 'bg-white/5 border-white/5'}`} />
              ))}
            </div>
          ) : topLevelComments.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <p className={`text-xs uppercase tracking-widest font-black ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>
                No comments yet
              </p>
              <p className={`text-[10px] uppercase tracking-wider ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>
                Be the first to share your thoughts on this feature post!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {topLevelComments.map((comment, index) => {
                const replies = getRepliesFor(comment.id);
                return (
                  <div key={comment.id || index} className="space-y-4">
                    <div 
                      className={`p-5 rounded-2xl border transition-all space-y-3 ${
                        isLightMode 
                          ? 'bg-black/[0.01] border-black/5 hover:bg-black/[0.02]' 
                          : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black border uppercase ${
                          isLightMode 
                            ? 'bg-slate-50 border-black/5 text-slate-700' 
                            : 'bg-white/5 border-white/10 text-white/80'
                        }`}>
                          {comment.author_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className={`text-xs font-black uppercase tracking-wider ${isLightMode ? 'text-slate-800' : 'text-white/90'}`}>
                            {comment.author_name}
                          </h5>
                          <span className={`text-[9px] font-mono block ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (activeReplyId === comment.id) {
                              setActiveReplyId(null);
                            } else {
                              setActiveReplyId(comment.id);
                              setReplyName("");
                              setReplyEmail("");
                              setReplyContent("");
                              setReplyErrorMessage("");
                              setReplySuccessMessage("");
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg border border-neon-purple/20 text-neon-purple hover:bg-neon-purple hover:text-white transition-all text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                        >
                          <CornerDownRight className="w-3 h-3" />
                          {activeReplyId === comment.id ? "Cancel" : "Reply"}
                        </button>
                      </div>
                      <p className={`text-xs leading-relaxed ${isLightMode ? 'text-slate-600' : 'text-white/70'}`}>
                        {comment.content}
                      </p>
                    </div>

                    {/* Replies list */}
                    {replies.length > 0 && (
                      <div className="ml-6 sm:ml-10 space-y-4 border-l-2 border-neon-purple/20 pl-4 sm:pl-6">
                        {replies.map((reply) => (
                          <div 
                            key={reply.id} 
                            className={`p-4 rounded-xl border transition-all space-y-2 ${
                              isLightMode 
                                ? 'bg-black/[0.005] border-black/5 hover:bg-black/[0.01]' 
                                : 'bg-white/[0.005] border-white/5 hover:bg-white/[0.01]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border uppercase ${
                                isLightMode 
                                  ? 'bg-slate-50 border-black/5 text-slate-700' 
                                  : 'bg-white/5 border-white/10 text-white/80'
                              }`}>
                                {reply.author_name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h6 className={`text-[11px] font-black uppercase tracking-wider ${isLightMode ? 'text-slate-800' : 'text-white/90'}`}>
                                    {reply.author_name}
                                  </h6>
                                  <span className={`text-[9px] font-mono ${isLightMode ? 'text-slate-400' : 'text-white/30'}`}>
                                    • {new Date(reply.created_at).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className={`text-xs leading-relaxed ${isLightMode ? 'text-slate-600' : 'text-white/70'}`}>
                              {reply.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Reply Form */}
                    {activeReplyId === comment.id && (
                      <form onSubmit={(e) => handleSubmitReply(e, comment.id)} className="ml-6 sm:ml-10 p-5 rounded-xl border border-neon-purple/20 bg-neon-purple/[0.02] space-y-4">
                        <div>
                          <h5 className="text-[10px] font-black uppercase tracking-[0.15em] text-neon-purple">
                            Replying to {comment.author_name}
                          </h5>
                        </div>

                        {replySuccessMessage && (
                          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-wider">
                            {replySuccessMessage}
                          </div>
                        )}

                        {replyErrorMessage && (
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider">
                            {replyErrorMessage}
                          </div>
                        )}                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={`block text-[8px] uppercase tracking-widest font-black mb-1 ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                              Your Name *
                            </label>
                            <input 
                              required
                              type="text" 
                              value={replyName}
                              onChange={e => setReplyName(e.target.value)}
                              placeholder="Name"
                              className={`w-full border rounded-lg px-3 py-2 text-xs font-sans focus:outline-none focus:border-neon-purple transition-all ${
                                isLightMode 
                                  ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:text-slate-900 shadow-sm' 
                                  : 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-black/40 focus:text-white'
                              }`}
                              style={isLightMode ? { backgroundColor: '#ffffff', color: '#0f172a', colorScheme: 'light' } : undefined}
                            />
                          </div>
                          <div>
                            <label className={`block text-[8px] uppercase tracking-widest font-black mb-1 ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                              Email Address (Optional)
                            </label>
                            <input 
                              type="email" 
                              value={replyEmail}
                              onChange={e => setReplyEmail(e.target.value)}
                              placeholder="alex@example.com"
                              className={`w-full border rounded-lg px-3 py-2 text-xs font-sans focus:outline-none focus:border-neon-purple transition-all ${
                                isLightMode 
                                  ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:text-slate-900 shadow-sm' 
                                  : 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-black/40 focus:text-white'
                              }`}
                              style={isLightMode ? { backgroundColor: '#ffffff', color: '#0f172a', colorScheme: 'light' } : undefined}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-[8px] uppercase tracking-widest font-black mb-1 ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                            Your Reply *
                          </label>
                          <textarea 
                            required
                            rows={3}
                            value={replyContent}
                            onChange={e => setReplyContent(e.target.value)}
                            placeholder="Write your reply..."
                            className={`w-full border rounded-lg px-3 py-2 text-xs font-sans focus:outline-none focus:border-neon-purple transition-all resize-none ${
                              isLightMode 
                                ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:text-slate-900 shadow-sm' 
                                : 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-black/40 focus:text-white'
                            }`}
                            style={isLightMode ? { backgroundColor: '#ffffff', color: '#0f172a', colorScheme: 'light' } : undefined}
                          />
                        </div>

                        <div className="flex gap-2">
                          <button 
                            disabled={isSubmittingReply}
                            type="submit"
                            className="px-4 py-2 bg-neon-purple hover:bg-neon-blue text-white disabled:opacity-50 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer"
                          >
                            {isSubmittingReply ? "Submitting..." : "Submit Reply"}
                          </button>
                          <button 
                            type="button"
                            onClick={() => setActiveReplyId(null)}
                            className={`px-4 py-2 border rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                              isLightMode ? 'border-black/10 text-slate-700 hover:bg-black/5' : 'border-white/10 text-white/80 hover:bg-white/5'
                            }`}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Comment Submission Form */}
          <form onSubmit={handleSubmitComment} className="space-y-5 pt-6 border-t border-white/5">
            <div>
              <h4 className={`text-xs font-black uppercase tracking-[0.2em] ${isLightMode ? 'text-slate-600' : 'text-white/50'}`}>
                Join the conversation
              </h4>
              <p className={`text-[10px] uppercase tracking-wider mt-1 ${isLightMode ? 'text-slate-500' : 'text-white/40'}`}>
                Your comment will be reviewed by administrators before being made public.
              </p>
            </div>

            {submitSuccess && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-wider">
                {submitSuccess}
              </div>
            )}

            {submitError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider">
                {submitError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-[9px] uppercase tracking-widest font-black mb-1.5 ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                  Your Name *
                </label>
                <input 
                  required
                  type="text" 
                  value={authorName}
                  onChange={e => setAuthorName(e.target.value)}
                  placeholder="e.g., Alex Johnson"
                  className={`w-full border rounded-xl px-4 py-3 text-xs font-sans focus:outline-none focus:border-neon-purple transition-all ${
                    isLightMode 
                      ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:text-slate-900 shadow-sm' 
                      : 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-black/40 focus:text-white'
                  }`}
                  style={isLightMode ? { backgroundColor: '#ffffff', color: '#0f172a', colorScheme: 'light' } : undefined}
                />
              </div>
              <div>
                <label className={`block text-[9px] uppercase tracking-widest font-black mb-1.5 ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                  Email Address (Optional, kept completely private)
                </label>
                <input 
                  type="email" 
                  value={authorEmail}
                  onChange={e => setAuthorEmail(e.target.value)}
                  placeholder="e.g., alex@example.com"
                  className={`w-full border rounded-xl px-4 py-3 text-xs font-sans focus:outline-none focus:border-neon-purple transition-all ${
                    isLightMode 
                      ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:text-slate-900 shadow-sm' 
                      : 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-black/40 focus:text-white'
                  }`}
                  style={isLightMode ? { backgroundColor: '#ffffff', color: '#0f172a', colorScheme: 'light' } : undefined}
                />
              </div>
            </div>

            <div>
              <label className={`block text-[9px] uppercase tracking-widest font-black mb-1.5 ${isLightMode ? 'text-slate-500' : 'text-white/30'}`}>
                Comment Content *
              </label>
              <textarea 
                required
                rows={4}
                value={contentText}
                onChange={e => setContentText(e.target.value)}
                placeholder="Write your comment, suggestions, or ideas..."
                className={`w-full border rounded-xl px-4 py-3 text-xs font-sans focus:outline-none focus:border-neon-purple transition-all resize-none ${
                  isLightMode 
                    ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:text-slate-900 shadow-sm' 
                    : 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-black/40 focus:text-white'
                }`}
                style={isLightMode ? { backgroundColor: '#ffffff', color: '#0f172a', colorScheme: 'light' } : undefined}
              />
            </div>

            <button 
              disabled={isSubmitting}
              type="submit"
              className="px-6 py-3 bg-neon-purple hover:bg-neon-blue text-white disabled:opacity-50 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-neon-purple/20 cursor-pointer"
            >
              {isSubmitting ? "Submitting Comment..." : "Submit Comment for Review"}
            </button>
          </form>
        </div>
      </div>
    </motion.article>
  );
}
