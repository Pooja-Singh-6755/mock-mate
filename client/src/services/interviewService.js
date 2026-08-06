import api from './api' 

export const getInterview = (interviewId) =>
  api.get(`/interview/${interviewId}`).then((res) => res.data.data);