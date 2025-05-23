import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, Clock, Users, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import InterviewInvitation from '@/components/interview/InterviewInvitation';

interface SessionData {
  id: string;
  position: {
    id: string;
    title: string;
  };
  candidate: {
    id: string;
    full_name: string;
    email: string;
  };
  start_time: string;
  end_time?: string;
  status: string;
  video_url?: string;
  created_at: string;
  invitations?: {
    token: string;
    status: string;
    expires_at: string;
  }[];
}

const SessionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('details');

  // Fetch session data
  const fetchSessionData = async () => {
    try {
      setLoading(true);
      if (!id) {
        throw new Error('Session ID is required');
      }

      const { data, error } = await supabase
        .from('interview_sessions')
        .select(`
          id,
          position:position_id (id, title),
          candidate:candidate_id (id, full_name, email),
          start_time,
          end_time,
          status,
          video_url,
          created_at,
          invitations:interview_invitations (
            token,
            status,
            expires_at
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Session not found');

      setSession(data);
    } catch (err) {
      console.error('Error fetching session:', err);
      setError(err instanceof Error ? err.message : 'Failed to load interview session');
      toast.error('Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionData();
  }, [id]);

  const startInterview = () => {
    navigate(`/interview/${id}`);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { className: 'bg-blue-100 text-blue-800', label: 'Scheduled' },
      in_progress: { className: 'bg-yellow-100 text-yellow-800', label: 'In Progress' },
      completed: { className: 'bg-green-100 text-green-800', label: 'Completed' },
      cancelled: { className: 'bg-red-100 text-red-800', label: 'Cancelled' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || {
      className: 'bg-gray-100 text-gray-800',
      label: status.charAt(0).toUpperCase() + status.slice(1)
    };
    
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || 'Session not found'}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Interview Session</h1>
          <p className="text-muted-foreground mt-1">
            {session.position.title} • {session.candidate.full_name}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {getStatusBadge(session.status)}
          
          {session.status === 'scheduled' && (
            <Button onClick={startInterview}>
              Start Interview
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="invitation">Invitation</TabsTrigger>
          {session.status === 'completed' && (
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="details" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
              <CardDescription>
                Information about this interview session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Position</h3>
                    <p className="text-lg font-medium">{session.position.title}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Candidate</h3>
                    <p className="text-lg font-medium">{session.candidate.full_name}</p>
                    <p className="text-sm text-muted-foreground">{session.candidate.email}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                    <div className="mt-1">{getStatusBadge(session.status)}</div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Scheduled Time</h3>
                    <div className="flex items-center mt-1">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      <p>{session.start_time ? format(parseISO(session.start_time), 'PPP p') : 'Not scheduled'}</p>
                    </div>
                  </div>
                  
                  {session.end_time && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Completed</h3>
                      <div className="flex items-center mt-1">
                        <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                        <p>{format(parseISO(session.end_time), 'PPP p')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Activity Timeline</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-primary/10 rounded-full p-1 mr-3 mt-0.5">
                      <Users className="h-3 w-3 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm">Session created</p>
                      <p className="text-xs text-muted-foreground">{format(parseISO(session.created_at), 'PPP p')}</p>
                    </div>
                  </div>
                  
                  {session.invitations && session.invitations.length > 0 && (
                    <div className="flex items-start">
                      <div className="bg-primary/10 rounded-full p-1 mr-3 mt-0.5">
                        <Calendar className="h-3 w-3 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm">Invitation {session.invitations[0].status}</p>
                        <p className="text-xs text-muted-foreground">Expires on {format(parseISO(session.invitations[0].expires_at), 'PPP')}</p>
                      </div>
                    </div>
                  )}
                  
                  {session.status === 'completed' && session.end_time && (
                    <div className="flex items-start">
                      <div className="bg-green-100 rounded-full p-1 mr-3 mt-0.5">
                        <Clock className="h-3 w-3 text-green-700" />
                      </div>
                      <div>
                        <p className="text-sm">Interview completed</p>
                        <p className="text-xs text-muted-foreground">{format(parseISO(session.end_time), 'PPP p')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="invitation" className="mt-6">
          <InterviewInvitation
            sessionId={session.id}
            candidateId={session.candidate.id}
            candidateName={session.candidate.full_name}
            candidateEmail={session.candidate.email}
            positionTitle={session.position.title}
            scheduledTime={session.start_time}
            tokenValue={session.invitations && session.invitations.length > 0 ? session.invitations[0].token : undefined}
            expiresAt={session.invitations && session.invitations.length > 0 ? session.invitations[0].expires_at : undefined}
            status={session.invitations && session.invitations.length > 0 ? session.invitations[0].status : undefined}
            onInvitationSent={fetchSessionData}
          />
        </TabsContent>
        
        {session.status === 'completed' && (
          <TabsContent value="transcript" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Interview Transcript</CardTitle>
                <CardDescription>
                  Full transcript of the interview session
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* This would be replaced with real transcript data */}
                <p className="text-muted-foreground text-center py-10">
                  Transcript is being processed. Check back soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SessionDetail; 