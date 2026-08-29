import TextInterview from "./TextInterview";

export default function TimedInterview(props) {
 return <TextInterview  {...props} timed secondsPerQuestion={60} />;
} 