export default function Ai({ name, logo, link }) {
  return (
    <div className="p-2 border-1 rounded-lg border-neutral-200 shadow-white bg-zinc-100 ">
      <div className="flex flex-col items-center">
        <h2 className="text-xl font-medium">{name}</h2>
        <img src={logo} alt="Ai" className="w-20 my-2 rounded-2xl" />
        <button
          className="bg-blue-600 hover:bg-blue-900 text-white font-bold py-2 rounded w-full cursor-pointer"
          onClick={() => {
            window.open(link || "https://chat.openai.com/", "_blank");
          }}
        >
          Visit
        </button>
      </div>
    </div>
  );
}
