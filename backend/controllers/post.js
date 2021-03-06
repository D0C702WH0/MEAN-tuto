const Post = require("../models/post");
const User = require("../models/user");
const sendEmail = require("../helpers/email/sendMail");
const commentNotif = require("../helpers/email/templates/commentsNotif");
const postNotif = require("../helpers/email/templates/postNotif");

/** Allows to create a new post */
exports.addPost = async (req, res, next) => {
  const fetchedUser = await User.findById({ _id: req.userData.userId });
  if (!fetchedUser || !fetchedUser.isActive) {
    return res.status(403).json({
      message: "Cet utilisateur ne possède pas de compte actif"
    });
  }
  try {
    const image = req.file ? req.file.location : null;
    const newPost = new Post({
      title: req.body.title,
      content: req.body.content,
      image: image,
      creator_id: req.userData.userId,
      creator_pseudo: fetchedUser.pseudo
    });
    const result = await newPost.save();
    const users = await User.find({ postNotif: true });
    await users
      .filter(notAuthor => notAuthor.pseudo !== fetchedUser.pseudo)
      .map(user => {
        sendEmail(postNotif(user.email, result.creator_pseudo, result.title));
      });
    const socketio = req.app.get("socketio");

    socketio.sockets.emit("NewData");

    return res.status(201).json({
      message: "Post crée avec succès",
      post: {
        id: result._id,
        title: result.title,
        content: result.content,
        image: result.image,
        creator_id: result.userId,
        creator_pseudo: result.pseudo
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "La création du post à échoué..."
    });
  }
};

/** Allows to create a new comment */
exports.addComment = async (req, res, next) => {
  const fetchedUser = await User.findById({ _id: req.userData.userId });
  const result = await Post.findOneAndUpdate(
    { _id: req.params.id },
    {
      $push: {
        comments: {
          content: req.body.comment,
          creator_id: fetchedUser._id,
          creator_pseudo: fetchedUser.pseudo
        }
      }
    }
  );

  const users = await User.find({ commentNotif: true });
  await users
    .filter(notAuthor => notAuthor.pseudo !== fetchedUser.pseudo)
    .map(user => {
      sendEmail(
        commentNotif(
          user.email,
          result.title,
          req.body.comment,
          fetchedUser.pseudo
        )
      );
    });
  const socketio = req.app.get("socketio");

  socketio.sockets.emit("NewData");

  return res.status(200).json({
    message: "Ok",
    post: result
  });
};

/** Allows to delete a comment */
exports.deleteComment = async (req, res, next) => {
  const result = await Post.findOneAndUpdate(
    { _id: req.params.postId },
    {
      $pull: {
        comments: {
          _id: req.params.commentId
        }
      }
    }
  );

  const socketio = req.app.get("socketio");

  socketio.sockets.emit("NewData");

  res.status(200).json({
    message: "Ok",
    post: result
  });
};

/** Allows to get all the posts */
exports.getPosts = (req, res, next) => {
  const pageSize = +req.query.pageSize; // The '+' allows to use the query as a number instead of a string
  const currentPage = +req.query.page;
  const postQuery = Post.find({ isActive: true });
  let fetchedPost;
  if (pageSize && currentPage) {
    postQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }
  postQuery
    .then(documents => {
      fetchedPost = documents;
      return Post.countDocuments();
    })
    .then(count => {
      res.status(200).json({
        message: "Posts fetched !",
        posts: fetchedPost,
        maxPosts: count
      });
    });
};

/** Allows to update a post */
exports.updatePost = async (req, res, next) => {
  let imagePath;
  if (req.file) {
    imagePath = req.file.location;
  } else {
    imagePath = !req.body.image ? null : req.body.image;
  }

  const originalPost = await Post.findById({ _id: req.body.id });

  const post = new Post({
    _id: req.body.id,
    title: req.body.title,
    content: req.body.content,
    image: imagePath,
    comments: originalPost.comments,
    creator: req.userData.userId
  });
  const result = await Post.updateOne(
    { _id: req.params.id, creator_id: req.userData.userId },
    post
  );

  if (result.n > 0) {
    const socketio = req.app.get("socketio");

    socketio.sockets.emit("NewData");

    res.status(200).json(`Update successful ! ${result}`);
  } else {
    res.status(401).json({ message: `Impossible de modifier ce post...` });
  }
};

/** Allows  to get a single post */
exports.getSinglePost = (req, res, next) => {
  Post.findById(req.params.id)
    .then(post => {
      if (post) {
        res.status(200).json(post);
      } else {
        res.status(404).json({ message: "Post non trouvé" });
      }
    })
    .catch(error => {
      res.status(500).json({
        message: "La modification du post à échoué..."
      });
    });
};

/** Allows to set a post isActive status to false */
exports.deletePost = async (req, res, next) => {
  const fetchedPost = await Post.findOne({
    _id: req.params.id,
    creator_id: req.userData.userId
  });

  if (!fetchedPost) {
    return res.status(403).json({
      message: "Vous n'êtes pas authorisé a supprimer ce post"
    });
  }

  try {
    await Post.findOneAndUpdate({ _id: fetchedPost._id }, { isActive: false });
    const socketio = req.app.get("socketio");

    socketio.sockets.emit("NewData");

    res.status(200).json({
      message: "Le message à bien été supprimé"
    });
  } catch {
    res.status(500).json({
      message: "La suppression du post à échoué..."
    });
  }
};
